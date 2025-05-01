export interface AnalysisConfig {
  applicationId: string;
  applicationSecret: string;
  uniqueId: string;
}

export interface PermissionsResult {
  fineLocationGranted: boolean;
  coarseLocationGranted: boolean;
  backgroundLocationGranted: boolean;
  bluetoothConnectGranted: boolean;
  bluetoothScanGranted: boolean;
  foregroundServiceGranted: boolean;
}

export interface AndroidConfigOptions {
  enabled?: boolean;
  openSystemBluetooth?: boolean;
  enableForegroundService?: boolean;
  serviceNotificationTitle?: string;
  notificationChannelName?: string;
  notificationChannelDescription?: string;
  notificationIconResourceId?: number;
}

export function startPoilabsAnalysis(config: AnalysisConfig): Promise<boolean>;

export function stopPoilabsAnalysis(): boolean;

export function askRuntimePermissionsIfNeeded(): Promise<boolean>;

export function checkAllPermissions(): Promise<boolean>;

export function requestRequiredPermissions(): Promise<boolean>;

export function startScanIfPermissionsGranted(): Promise<boolean>;

export function checkBluetoothPermission(): Promise<boolean>;

export function configureAnalysisSDK(
  options: AndroidConfigOptions
): Promise<boolean>;

export function updateUniqueId(uniqueId: string): Promise<boolean>;
