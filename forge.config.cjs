const path = require('node:path');

module.exports = {
  packagerConfig: {
    asar: true,
    extraResource: [
      path.join(__dirname, 'assets', 'StoreLogo.png'),
      path.join(__dirname, 'assets', 'Square44x44Logo.png'),
      path.join(__dirname, 'assets', 'Square150x150Logo.png'),
      path.join(__dirname, 'assets', 'Wide310x150Logo.png'),
      path.join(__dirname, 'assets', 'Square310x310Logo.png'),
      path.join(__dirname, 'assets', 'SplashScreen.png')
    ],
    executableName: 'Everstep',
    icon: path.join(__dirname, 'assets', 'icon'),
    win32metadata: {
      CompanyName: 'Zorbey',
      FileDescription: 'Everstep Pomodoro Timer and Focus App',
      OriginalFilename: 'Everstep.exe',
      ProductName: 'Everstep',
      InternalName: 'Everstep'
    },
    ignore: [
      /^\/src($|\/)/,
      /^\/scripts($|\/)/,
      /^\/store($|\/)/,
      /^\/public($|\/)/,
      /^\/\.github($|\/)/,
      /^\/STORE_SUBMISSION_GUIDE_TR\.md$/,
      /^\/PROJECT_STATUS\.md$/,
      /^\/THIRD_PARTY_NOTICES\.md$/,
      /^\/SECURITY\.md$/,
      /^\/BUILD_MSIX\.(ps1|bat)$/,
      /^\/SET_STORE_IDENTITY\.ps1$/,
      /^\/Package\.appxmanifest$/,
      /^\/forge\.config\.cjs$/,
      /^\/\.nvmrc$/,
      /^\/README\.md$/,
      /^\/PRIVACY_POLICY_(TR|EN|ES)\.md$/,
      /^\/SUPPORT_(TR|EN|ES)\.md$/,
      /^\/CHANGELOG\.md$/,
      /^\/START_EVERSTEP\.bat$/,
      /^\/tsconfig\.json$/,
      /^\/vite\.config\.ts$/,
      /^\/index\.html$/
    ]
  },
  makers: [
    {
      name: '@electron-forge/maker-zip',
      platforms: ['win32']
    },
      {
          name: '@electron-forge/maker-msix',
          config: {
              appManifest: path.join(__dirname, 'Package.appxmanifest'),
              windowsKitPath: 'C:\\Program Files (x86)\\Windows Kits\\10\\bin\\10.0.26100.0\\x64',
              sign: false,
              logLevel: 'info'
          }
      }
  ]
};
