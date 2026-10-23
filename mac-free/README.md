# Free Mac channel

This channel uses Sparkle Ed25519-signed appcasts and archives. Apple Developer ID is not required. Existing paid/Developer ID feeds under `mac/` remain separate.

No unsigned placeholder XML is served. Until a trusted public key and first signed release exist, clients fail closed. Pin the 32-byte base64 public key in `config/mac-free-ed25519-public-key.txt`; never publish the private key. A changed public key is a trust migration, not a routine setting.

Upload `mac-free-arm64.xml` and/or `mac-free-x64.xml` signed by Sparkle plus the exact referenced `Suishouwen-V-mac-free-ARCH.zip` to stable release `vV`. Publishing triggers verification. Both appcast bytes and ZIP bytes must verify against the tracked key; the app must embed the same key, feed URL and strict signature settings. The workflow promotes the original signed XML bytes only after archive identity/version/architecture validation. No regeneration of XML in CI.

Free signing does not grant Apple notarization or remove first-install Gatekeeper prompts. Initial installation must be user-approved; subsequent archive authenticity is checked against the app's embedded public key. Never disable macOS security globally.
