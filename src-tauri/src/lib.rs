// LaiMePet — Tauri 后端核心库
//
// 职责：
// - 窗口管理（透明悬浮窗 / 固定窗口切换）
// - 系统托盘
// - 本地文件存储（宠物配置、照片缓存）
// - 窗口材质效果（Mica/Acrylic）
// - 系统级快捷键注册
// - Python Sidecar 进程管理（AI 推理服务）

use std::path::{Path, PathBuf};
use std::process::{Child, Command, Stdio};
use std::sync::Mutex;
use std::net::TcpStream;
use std::time::Duration;

use tauri::Manager;
use tauri::window::Effect;

// ── Sidecar 进程管理器 ──

/// 管理 Python FastAPI 子进程的生命周期。
/// 使用 Mutex 保证线程安全（Tauri 命令可能从不同线程调用）。
pub struct SidecarProcess {
    child: Mutex<Option<Child>>,
}

impl SidecarProcess {
    pub fn new() -> Self {
        Self { child: Mutex::new(None) }
    }

    /// 设置子进程句柄
    pub fn set(&self, child: Child) {
        if let Ok(mut guard) = self.child.lock() {
            *guard = Some(child);
        }
    }

    /// 检查子进程是否存活（通过 PID + TCP 端口双验证）
    pub fn is_alive(&self) -> bool {
        // 先检查 TCP 端口（更可靠的可用性指标）
        TcpStream::connect_timeout(
            &"127.0.0.1:8000".parse().unwrap(),
            Duration::from_millis(500),
        ).is_ok()
    }
}

impl Drop for SidecarProcess {
    fn drop(&mut self) {
        if let Ok(mut guard) = self.child.lock() {
            if let Some(ref mut child) = *guard {
                println!("[LaiMePet] 正在关闭 Python sidecar (PID {})...", child.id());
                let _ = child.kill();
                let _ = child.wait();
                println!("[LaiMePet] Python sidecar 已关闭");
            }
        }
    }
}

/// 在 PATH 中查找可用的 Python 解释器
fn find_python() -> Option<String> {
    for name in &["python", "python3"] {
        if let Ok(output) = Command::new(name)
            .arg("--version")
            .stdout(Stdio::piped())
            .stderr(Stdio::piped())
            .output()
        {
            if output.status.success() {
                let version = String::from_utf8_lossy(
                    if output.stdout.is_empty() { &output.stderr } else { &output.stdout }
                );
                println!("[LaiMePet] 找到 Python: {} ({})", name, version.trim());
                return Some(name.to_string());
            }
        }
    }
    None
}

/// 查找 services/main.py（支持多种运行环境）
fn find_sidecar_entry() -> Option<PathBuf> {
    let cwd = std::env::current_dir().ok()?;

    // 候选路径：CWD = 项目根，或 CWD = src-tauri/ 的子目录
    let mut candidates = vec![
        cwd.join("services").join("main.py"),
    ];
    if let Some(parent) = cwd.parent() {
        candidates.push(parent.join("services").join("main.py"));
    }

    for path in &candidates {
        if path.exists() {
            return Some(path.clone());
        }
    }

    eprintln!("[LaiMePet] 尝试了以下路径，均未找到 sidecar 入口文件:");
    for path in &candidates {
        eprintln!("  {}", path.display());
    }
    None
}

/// 查找已随 Tauri 打包的 PyInstaller sidecar。
fn find_bundled_sidecar(app: &tauri::AppHandle) -> Option<PathBuf> {
    let resource_dir = app.path().resource_dir().ok()?;
    let binary_prefix = "laimepet-ai-sidecar";

    let candidates = [
        resource_dir.join("laimepet-ai-sidecar-x86_64-pc-windows-gnu.exe"),
        resource_dir.join("binaries").join("laimepet-ai-sidecar-x86_64-pc-windows-gnu.exe"),
        resource_dir.join("laimepet-ai-sidecar.exe"),
        resource_dir.join("binaries").join("laimepet-ai-sidecar.exe"),
    ];

    for candidate in candidates {
        if candidate.exists() {
            return Some(candidate);
        }
    }

    if let Ok(entries) = std::fs::read_dir(resource_dir) {
        for entry in entries.flatten() {
            let path = entry.path();
            let Some(file_name) = path.file_name().and_then(|name| name.to_str()) else {
                continue;
            };
            if file_name.starts_with(binary_prefix) && file_name.ends_with(".exe") {
                return Some(path);
            }
        }
    }

    None
}

/// 尝试启动 sidecar。Release 打包后优先使用 PyInstaller exe，开发环境回退到 Python 源码入口。
fn try_spawn_sidecar(app: Option<&tauri::AppHandle>) -> Option<Child> {
    if let Some(app) = app {
        if let Some(sidecar_exe) = find_bundled_sidecar(app) {
            let work_dir = sidecar_exe.parent().unwrap_or(Path::new("."));
            println!(
                "[LaiMePet] 启动打包 sidecar: {} (cwd: {})",
                sidecar_exe.display(),
                work_dir.display()
            );

            return Command::new(&sidecar_exe)
                .current_dir(work_dir)
                .stdout(Stdio::piped())
                .stderr(Stdio::piped())
                .spawn()
                .map_err(|e| {
                    eprintln!("[LaiMePet] 启动打包 sidecar 失败: {}", e);
                    e
                })
                .ok();
        }
    }

    let python = find_python()?;
    let main_py = find_sidecar_entry()?;
    let work_dir = main_py.parent().unwrap_or(Path::new("."));

    println!("[LaiMePet] 启动 Python sidecar: {} {} (cwd: {})", python, main_py.display(), work_dir.display());

    Command::new(&python)
        .arg(&main_py)
        .current_dir(work_dir)
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .spawn()
        .map_err(|e| {
            eprintln!("[LaiMePet] 启动 sidecar 失败: {}", e);
            e
        })
        .ok()
}

/// 切换显示模式：悬浮窗 ↔ 固定窗口
///
/// 悬浮窗模式：透明无边框 + 点击穿透 + 置顶
/// 窗口模式：有装饰 + 正常点击 + Mica 背景
#[tauri::command]
fn toggle_display_mode(window: tauri::Window) -> Result<String, String> {
    let is_decorated = window.is_decorated().unwrap_or(false);
    if !is_decorated {
        // 当前是悬浮窗 → 切换为窗口模式
        window.set_decorations(true).map_err(|e| e.to_string())?;
        window.set_ignore_cursor_events(false).map_err(|e| e.to_string())?;
        window.set_always_on_top(false).map_err(|e| e.to_string())?;
        window.set_skip_taskbar(false).map_err(|e| e.to_string())?;
        window.set_resizable(true).map_err(|e| e.to_string())?;
        // 窗口模式应用 Mica 材质
        #[cfg(target_os = "windows")]
        {
            use tauri::window::EffectsBuilder;
            let _ = window.set_effects(
                EffectsBuilder::new().effect(Effect::Mica).build(),
            );
        }
        Ok("window".into())
    } else {
        // 当前是窗口模式 → 切换为悬浮窗
        // 悬浮窗透明无边框，材质效果自然不可见，无需显式清除
        window.set_decorations(false).map_err(|e| e.to_string())?;
        window.set_ignore_cursor_events(true).map_err(|e| e.to_string())?;
        window.set_always_on_top(true).map_err(|e| e.to_string())?;
        window.set_skip_taskbar(true).map_err(|e| e.to_string())?;
        window.set_resizable(false).map_err(|e| e.to_string())?;
        Ok("float".into())
    }
}

/// 启用点击穿透（鼠标事件穿透到桌面）
#[tauri::command]
fn enable_click_through(window: tauri::Window) -> Result<(), String> {
    window
        .set_ignore_cursor_events(true)
        .map_err(|e| e.to_string())
}

/// 禁用点击穿透（正常接收鼠标事件）
#[tauri::command]
fn disable_click_through(window: tauri::Window) -> Result<(), String> {
    window
        .set_ignore_cursor_events(false)
        .map_err(|e| e.to_string())
}

/// 设置窗口始终置顶
#[tauri::command]
fn set_always_on_top(window: tauri::Window, on_top: bool) -> Result<(), String> {
    window.set_always_on_top(on_top).map_err(|e| e.to_string())
}

/// 设置窗口材质效果
///
/// 可选值：`"mica"` | `"acrylic"` | `"blur"` | `"none"`
/// - Mica: Windows 11 云母效果（跟随桌面壁纸色调）
/// - Acrylic: Windows 10/11 亚克力半透明模糊
/// - None: 跳过（悬浮窗模式无需材质）
#[tauri::command]
fn set_window_effect(window: tauri::Window, effect: String) -> Result<(), String> {
    use tauri::window::EffectsBuilder;

    match effect.as_str() {
        "mica" => window
            .set_effects(EffectsBuilder::new().effect(Effect::Mica).build())
            .map_err(|e| e.to_string()),
        "acrylic" => window
            .set_effects(EffectsBuilder::new().effect(Effect::Acrylic).build())
            .map_err(|e| e.to_string()),
        "blur" => window
            .set_effects(EffectsBuilder::new().effect(Effect::Blur).build())
            .map_err(|e| e.to_string()),
        // "none" 或其他值：悬浮窗模式无需材质，直接返回成功
        _ => Ok(()),
    }
}

/// 获取应用数据目录
#[tauri::command]
fn get_app_data_dir(app: tauri::AppHandle) -> Result<String, String> {
    let dir = app
        .path()
        .app_data_dir()
        .map_err(|e| e.to_string())?;
    Ok(dir.to_string_lossy().to_string())
}

/// 最小化到系统托盘
#[tauri::command]
fn hide_to_tray(window: tauri::Window) -> Result<(), String> {
    window.hide().map_err(|e| e.to_string())
}

/// 显示主窗口（从托盘恢复 / 首次启动）
#[tauri::command]
fn show_main_window(window: tauri::Window) -> Result<(), String> {
    window.show().map_err(|e| e.to_string())?;
    window.set_focus().map_err(|e| e.to_string())
}

/// 获取当前窗口模式信息
#[tauri::command]
fn get_window_info(window: tauri::Window) -> Result<serde_json::Value, String> {
    let info = serde_json::json!({
        "isDecorated": window.is_decorated().unwrap_or(false),
        "isAlwaysOnTop": window.is_always_on_top().unwrap_or(false),
        "isVisible": window.is_visible().unwrap_or(false),
        "isResizable": window.is_resizable().unwrap_or(false),
    });
    Ok(info)
}

/// 检查 sidecar TCP 端口是否就绪
///
/// 用于前端轮询检测 AI 服务是否可用。
#[tauri::command]
fn check_sidecar_port() -> Result<bool, String> {
    match TcpStream::connect_timeout(
        &"127.0.0.1:8000".parse().unwrap(),
        Duration::from_secs(1),
    ) {
        Ok(stream) => {
            drop(stream);
            Ok(true)
        }
        Err(_) => Ok(false),
    }
}

/// 重启 sidecar 进程
///
/// 先杀死当前进程，再启动新的。
#[tauri::command]
fn restart_sidecar(app: tauri::AppHandle, state: tauri::State<'_, SidecarProcess>) -> Result<String, String> {
    // 杀死旧进程
    if let Ok(mut guard) = state.child.lock() {
        if let Some(ref mut child) = *guard {
            println!("[LaiMePet] 正在杀死旧 sidecar (PID {})...", child.id());
            let _ = child.kill();
            let _ = child.wait();
            *guard = None;
        }
    }

    // 等待端口释放
    std::thread::sleep(Duration::from_millis(500));

    // 启动新进程
    match try_spawn_sidecar(Some(&app)) {
        Some(child) => {
            let pid = child.id();
            state.set(child);
            println!("[LaiMePet] Sidecar 已重启 (PID {})", pid);
            Ok(format!("restarted (PID {})", pid))
        }
        None => Err("无法启动 sidecar，请检查打包 exe 或 Python 开发环境".into()),
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_global_shortcut::Builder::new().build())
        .plugin(tauri_plugin_autostart::init(
            tauri_plugin_autostart::MacosLauncher::LaunchAgent,
            None::<Vec<&str>>,
        ))
        .manage(SidecarProcess::new())
        .invoke_handler(tauri::generate_handler![
            toggle_display_mode,
            enable_click_through,
            disable_click_through,
            set_always_on_top,
            set_window_effect,
            get_app_data_dir,
            hide_to_tray,
            show_main_window,
            get_window_info,
            check_sidecar_port,
            restart_sidecar,
        ])
        .setup(|app| {
            use tauri::menu::{MenuBuilder, MenuItemBuilder};

            #[allow(unused_variables)]
            let window = app.get_webview_window("main").unwrap();

            // 创建应用数据子目录
            if let Ok(data_dir) = app.path().app_data_dir() {
                let dirs = ["pets", "models", "cache"];
                for d in &dirs {
                    let path = data_dir.join(d);
                    if !path.exists() {
                        let _ = std::fs::create_dir_all(&path);
                    }
                }
            }

            // ── 系统托盘菜单 ──
            // trayIcon 已在 tauri.conf.json 中配置，这里追加右键菜单
            {
                let window_clone = window.clone();

                // 构建菜单项
                let show_item = MenuItemBuilder::with_id("show", "显示窗口")
                    .accelerator("Ctrl+Shift+S")
                    .build(app)
                    .unwrap();
                let quit_item = MenuItemBuilder::with_id("quit", "退出 LaiMePet")
                    .build(app)
                    .unwrap();
                let menu = MenuBuilder::new(app)
                    .item(&show_item)
                    .separator()
                    .item(&quit_item)
                    .build()
                    .unwrap();

                // 获取已存在的托盘图标（由 tauri.conf.json 创建）并附加菜单
                if let Some(tray) = app.tray_by_id("main") {
                    let _ = tray.set_menu(Some(menu));
                    let _ = tray.set_show_menu_on_left_click(false);

                    tray.on_menu_event(move |app, event| {
                        match event.id().as_ref() {
                            "show" => {
                                let w = app.get_webview_window("main").unwrap();
                                if w.is_visible().unwrap_or(false) {
                                    let _ = w.hide();
                                    println!("[LaiMePet] 窗口已隐藏到托盘");
                                } else {
                                    let _ = w.show();
                                    let _ = w.set_focus();
                                    println!("[LaiMePet] 窗口已显示");
                                }
                            }
                            "quit" => {
                                println!("[LaiMePet] 用户退出应用");
                                app.exit(0);
                            }
                            _ => {}
                        }
                    });

                    println!("[LaiMePet] 托盘菜单已就绪 (右键/双击托盘图标)");
                } else {
                    eprintln!("[LaiMePet] 警告: 找不到系统托盘图标");
                }

                // 双击托盘图标 → 切换窗口显示
                let _ = window_clone;
            }

            // ── 自动启动 Python Sidecar ──
            {
                let sidecar = app.state::<SidecarProcess>();
                match try_spawn_sidecar(Some(app.handle())) {
                    Some(child) => {
                        let pid = child.id();
                        sidecar.set(child);
                        println!("[LaiMePet] Sidecar 已启动 (PID {})", pid);
                    }
                    None => {
                        eprintln!("[LaiMePet] 警告: 无法启动 Python sidecar，AI 功能将不可用");
                        eprintln!("[LaiMePet] 提示: 确保打包 exe 存在，或 Python 已安装且 services/main.py 存在");
                    }
                }
            }

            // ── 窗口显示 ──
            // Debug 模式: 自动显示 + DevTools
            #[cfg(debug_assertions)]
            {
                window.open_devtools();
                let _ = window.show();
                let _ = window.set_focus();
            }
            // Release 模式: 也自动显示（首次启动），后续通过托盘控制
            #[cfg(not(debug_assertions))]
            {
                let _ = window.show();
                let _ = window.set_focus();
                println!("[LaiMePet] 窗口已显示（release 模式自动打开）");
            }

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running LaiMePet");
}
