/**
 * Tauri 服务抽象层
 *
 * 封装 Tauri invoke API，提供：
 * 1. 类型安全的命令调用
 * 2. 浏览器模式自动降级（不使用 Tauri 时）
 * 3. 统一的错误处理
 *
 * 当 Rust 安装后，安装 @tauri-apps/api 并替换各方法实现
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
      // 动态加载 Tauri API（仅 Tauri 环境可用）
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore — @tauri-apps/api 仅在 Tauri 构建环境中安装
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

/** 切换显示模式 */
export async function toggleDisplayMode(): Promise<'float' | 'window'> {
  const invoke = await getInvoke();
  return (await invoke('toggle_display_mode')) as 'float' | 'window';
}

/** 设置窗口置顶 */
export async function setAlwaysOnTop(onTop: boolean): Promise<void> {
  const invoke = await getInvoke();
  await invoke('set_always_on_top', { onTop });
}

/** 获取应用数据目录 */
export async function getAppDataDir(): Promise<string> {
  const invoke = await getInvoke();
  return (await invoke('get_app_data_dir')) as string;
}

/** 隐藏到系统托盘 */
export async function hideToTray(): Promise<void> {
  const invoke = await getInvoke();
  await invoke('hide_to_tray');
}

// ── 文件操作（后续对接）──

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
