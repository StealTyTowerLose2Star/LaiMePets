// LaiMePet — Tauri 后端核心库
//
// 职责：
// - 窗口管理（透明悬浮窗 / 固定窗口切换）
// - 系统托盘
// - 本地文件存储（宠物配置、照片缓存）
// - AI 模型调用接口（后续 Sprint）
// - 系统级快捷键注册

use tauri::Manager;

/// 切换显示模式：悬浮窗 ↔ 固定窗口
#[tauri::command]
fn toggle_display_mode(window: tauri::Window) -> Result<String, String> {
    let is_decorated = window.is_decorated().unwrap_or(false);
    window.set_decorations(!is_decorated).map_err(|e| e.to_string())?;
    window
        .set_ignore_cursor_events(is_decorated) // 悬浮窗模式穿透点击
        .map_err(|e| e.to_string())?;
    Ok(if !is_decorated {
        "float".into()
    } else {
        "window".into()
    })
}

/// 设置窗口始终置顶
#[tauri::command]
fn set_always_on_top(window: tauri::Window, on_top: bool) -> Result<(), String> {
    window.set_always_on_top(on_top).map_err(|e| e.to_string())
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
        .invoke_handler(tauri::generate_handler![
            toggle_display_mode,
            set_always_on_top,
            get_app_data_dir,
            hide_to_tray,
        ])
        .setup(|app| {
            // 初始化应用数据目录
            let _data_dir = app.path().app_data_dir()?;
            // TODO: 创建必要子目录（pets/, models/, cache/）

            #[cfg(debug_assertions)]
            {
                let window = app.get_webview_window("main").unwrap();
                window.open_devtools();
            }
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running LaiMePet");
}
