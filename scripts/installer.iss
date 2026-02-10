; PlixMetrics Inno Setup Installer Script
; Requires Inno Setup 6+ (https://jrsoftware.org/isinfo.php)
;
; Build with:
;   iscc /DAppVersion=1.0.3 /DSourceDir=.\build-win /DOutputDir=.\releases installer.iss

#ifndef AppVersion
  #define AppVersion "1.0.0"
#endif

#ifndef SourceDir
  #define SourceDir "..\build-win"
#endif

#ifndef OutputDir
  #define OutputDir "..\releases"
#endif

[Setup]
AppId={{A3F2E1D0-B4C5-6D7E-8F9A-0B1C2D3E4F5A}
AppName=PlixMetrics
AppVersion={#AppVersion}
AppVerName=PlixMetrics v{#AppVersion}
AppPublisher=Plix Labs
AppPublisherURL=https://github.com/plix-labs/PlixMetrics
AppSupportURL=https://github.com/plix-labs/PlixMetrics/issues
DefaultDirName={autopf}\PlixMetrics
DefaultGroupName=PlixMetrics
AllowNoIcons=yes
OutputDir={#OutputDir}
OutputBaseFilename=PlixMetrics-Setup-v{#AppVersion}
Compression=lzma2/ultra64
SolidCompression=yes
WizardStyle=modern
PrivilegesRequired=admin
UninstallDisplayName=PlixMetrics
UninstallDisplayIcon={app}\app\plixmetrics.ico
ArchitecturesAllowed=x64compatible
ArchitecturesInstallIn64BitMode=x64compatible
SetupIconFile={#SourceDir}\app\plixmetrics.ico
LicenseFile=
MinVersion=10.0

[Languages]
Name: "english"; MessagesFile: "compiler:Default.isl"
Name: "spanish"; MessagesFile: "compiler:Languages\Spanish.isl"

[Tasks]
Name: "desktopicon"; Description: "{cm:CreateDesktopIcon}"; GroupDescription: "{cm:AdditionalIcons}"
Name: "startupicon"; Description: "Start PlixMetrics when Windows starts"; GroupDescription: "Startup:"

[Files]
; Node.js portable
Source: "{#SourceDir}\node\node.exe"; DestDir: "{app}\node"; Flags: ignoreversion

; Application files
Source: "{#SourceDir}\app\*"; DestDir: "{app}\app"; Flags: ignoreversion recursesubdirs createallsubdirs

; Launcher
Source: "{#SourceDir}\PlixMetrics.bat"; DestDir: "{app}"; Flags: ignoreversion

[Icons]
Name: "{group}\PlixMetrics"; Filename: "{app}\PlixMetrics.bat"; IconFilename: "{app}\app\plixmetrics.ico"; Comment: "Open PlixMetrics Dashboard"
Name: "{group}\Uninstall PlixMetrics"; Filename: "{uninstallexe}"
Name: "{autodesktop}\PlixMetrics"; Filename: "{app}\PlixMetrics.bat"; IconFilename: "{app}\app\plixmetrics.ico"; Tasks: desktopicon
Name: "{userstartup}\PlixMetrics"; Filename: "{app}\PlixMetrics.bat"; IconFilename: "{app}\app\plixmetrics.ico"; Tasks: startupicon

[Run]
; Launch after install
Filename: "{app}\PlixMetrics.bat"; Description: "Launch PlixMetrics"; Flags: nowait postinstall skipifsilent shellexec

[UninstallRun]
; Stop server before uninstall
Filename: "taskkill"; Parameters: "/F /IM node.exe /FI ""WINDOWTITLE eq PlixMetrics"""; Flags: runhidden

[UninstallDelete]
; Clean up cache (but NOT user data in %APPDATA%)
Type: filesandordirs; Name: "{app}\app\cache"

[Code]
// Show a message about data preservation on uninstall
procedure CurUninstallStepChanged(CurUninstallStep: TUninstallStep);
begin
  if CurUninstallStep = usPostUninstall then
  begin
    MsgBox('PlixMetrics has been uninstalled.' + #13#10 + #13#10 +
           'Your data (servers, settings) has been preserved in:' + #13#10 +
           ExpandConstant('{userappdata}\PlixMetrics') + #13#10 + #13#10 +
           'You can delete this folder manually if you no longer need it.',
           mbInformation, MB_OK);
  end;
end;
