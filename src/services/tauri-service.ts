/**
 * Tauri 服务抽象层
 *
 * 封装 Tauri invoke API，提供：
 * 1. 类型安全的命令调用
 * 2. 浏览器模式自动降级（不使用 Tauri 时）
 * 3. 统一的错误处理
 */

interface TauriInvoke {
  (cmd: string, args?: Record<string, unknown>): Promise<unknown>;
}

let _invoke: TauriInvoke | null = null;

/** 检测是否在 Tauri 环境中运行 */
export function isTauri(): boolean {
  return typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;
}

/** 浏览器降级 mock */
function createMockInvoke(): TauriInvoke {
  return async (cmd: string, _args?: Record<string, unknown>) => {
    console.debug(`[Tauri Mock] invoke: ${cmd}`, _args);
    return null;
  };
}

async function getInvoke(): Promise<TauriInvoke> {
  if (_invoke) return _invoke;

  if (isTauri()) {
    try {
      const tauriCore = await import('@tauri-apps/api/core');
      _invoke = tauriCore.invoke as TauriInvoke;
    } catch {
      console.warn('[Tauri] 未能加载 @tauri-apps/api，使用降级模式');
      _invoke = createMockInvoke();
    }
  } else {
    _invoke = createMockInvoke();
  }

  return _invoke;
}

// ── 窗口控制 ──

/** 切换显示模式：悬浮窗 ↔ 窗口模式 */
export async function toggleDisplayMode(): Promise<'float' | 'window'> {
  const invoke = await getInvoke();
  return (await invoke('toggle_display_mode')) as 'float' | 'window';
}

/** 启用点击穿透（悬浮窗模式：鼠标事件穿透到桌面） */
export async function enableClickThrough(): Promise<void> {
  const invoke = await getInvoke();
  await invoke('enable_click_through');
}

/** 禁用点击穿透（正常接收鼠标事件） */
export async function disableClickThrough(): Promise<void> {
  const invoke = await getInvoke();
  await invoke('disable_click_through');
}

/** 设置窗口置顶 */
export async function setAlwaysOnTop(onTop: boolean): Promise<void> {
  const invoke = await getInvoke();
  await invoke('set_always_on_top', { onTop });
}

/** 设置窗口材质效果 */
export async function setWindowEffect(
  effect: 'mica' | 'acrylic' | 'blur' | 'none',
): Promise<void> {
  const invoke = await getInvoke();
  await invoke('set_window_effect', { effect });
}

/** 显示主窗口 */
export async function showMainWindow(): Promise<void> {
  const invoke = await getInvoke();
  await invoke('show_main_window');
}

/** 隐藏到系统托盘 */
export async function hideToTray(): Promise<void> {
  const invoke = await getInvoke();
  await invoke('hide_to_tray');
}

/** 获取窗口信息 */
export async function getWindowInfo(): Promise<{
  isDecorated: boolean;
  isAlwaysOnTop: boolean;
  isVisible: boolean;
  isResizable: boolean;
} | null> {
  const invoke = await getInvoke();
  return (await invoke('get_window_info')) as Awaited<
    ReturnType<typeof getWindowInfo>
  >;
}

// ── 文件存储 ──

/** 获取应用数据目录 */
export async function getAppDataDir(): Promise<string> {
  const invoke = await getInvoke();
  return (await invoke('get_app_data_dir')) as string;
}

// ── Sidecar 管理 ──

/** 检查 Python sidecar 端口是否就绪 */
export async function checkSidecarPort(): Promise<boolean> {
  if (!isTauri()) return false;
  const invoke = await getInvoke();
  return (await invoke('check_sidecar_port')) as boolean;
}

/** 重启 Python sidecar 进程 */
export async function restartSidecar(): Promise<string> {
  if (!isTauri()) throw new Error('仅在 Tauri 环境中可用');
  const invoke = await getInvoke();
  return (await invoke('restart_sidecar')) as string;
}

/**
 * 等待 sidecar 就绪（轮询 TCP 端口）。
 * 超时后抛出错误。
 */
export async function waitForSidecar(timeoutMs: number = 15000): Promise<void> {
  if (!isTauri()) return; // 浏览器模式，Vite proxy 已就绪

  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const ready = await checkSidecarPort();
    if (ready) return;
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error('Python AI 服务启动超时，请检查 Python 是否已安装');
}

// ── 文件存储 ──

/** 保存 JSON 数据到应用目录 */
export async function saveJSON(filename: string, data: unknown): Promise<void> {
  if (isTauri()) {
    const invoke = await getInvoke();
    await invoke('save_json', { filename, data });
  } else {
    localStorage.setItem(`lai-me-pet:${filename}`, JSON.stringify(data));
  }
}

/** 从应用目录读取 JSON 数据 */
export async function loadJSON<T>(filename: string): Promise<T | null> {
  if (isTauri()) {
    const invoke = await getInvoke();
    return (await invoke('load_json', { filename })) as T;
  } else {
    const raw = localStorage.getItem(`lai-me-pet:${filename}`);
    return raw ? (JSON.parse(raw) as T) : null;
  }
}
