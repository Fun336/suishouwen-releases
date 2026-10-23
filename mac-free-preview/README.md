# Isolated Mac OTA preview

This channel is exclusively for `local.wenyiwen.ota-preview` (随手问 OTA 测试版).
It must never contain the production application. Preview builds use a separate,
persistent profile and do not migrate the installed user's data.

The initial feeds are byte-identical copies of the authenticated empty bootstrap
feeds. They announce no update. The stable-release promotion workflow does not
write this directory. A populated preview feed requires separate review of the
preview bundle identity, archive signature, and feed signature.

Ad-hoc signing does not guarantee retention of macOS privacy permissions across
versions. Ed25519 signatures authenticate update content, not macOS code identity.
