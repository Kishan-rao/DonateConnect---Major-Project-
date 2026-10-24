import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.donateconnect.app',
  appName: 'DonateConnect',
  webDir: 'dist',
  server: {
    androidScheme: 'https'
  },
  plugins: {
    LiveUpdate: {
      readyTimeout: 10000,
      autoDeleteBundles: true,
      autoBlockRolledBackBundles: true,
      publicKey: `-----BEGIN PUBLIC KEY-----
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA0yXXjXbFxEJjxZpsJkfH
LBsf0ZQHakh2pXShRiAcLGfjhwx4kQKKxb469+VnKWu2gslsh9KQExyN29srKXIi
Xvt29fwNYLbu25w+q1u5QVieuDIDflcFX3BEvTGyWatoVLm6R1beapgFFiKmIfVo
tWAQbA62DHwNH8C1Iv5I8fdAQ44CuiTiE3P2LNgotxKILIsaBFgfO2AgtVyImDXC
2KB3xqFH1HYb9Rw9hmuyMxnuJfxbPY39z1PDhDp+bkoJvVnSPiH3BDclTR61JBPo
IMA5V8TKZKwdXNGxd31VtCcAQeHrV9KQa4kA3tHcMxvSijgPLrGaANjZe6JKUOlZ
GQIDAQAB
-----END PUBLIC KEY-----`
    }
  }
};

export default config;
