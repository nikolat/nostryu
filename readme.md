# Nostrゅう

## これはなに？

伺かのPLUGINです。  
Nostrのリレーからイベントを取得してゴーストにSSTPで送信します。  
以下に送信しているSSTPの例を挙げます。

```
NOTIFY SSTP/1.1
Charset: UTF-8
SecurityLevel: external
Sender: Node.js
Event: OnNostr
Reference0: Nostr/0.3
Reference1: note(kind)
Reference1: おはノスー！(content)
Reference2: nosuta(name)
Reference3: のす太(display_name)
Reference4: https://example.com/avatar.png(picture)
Option: nobreak
Script: \0おはノスー！\e
```

## 使用モジュール等

- [Node.js](https://nodejs.org/)
- [SHIOLINK](https://github.com/ekicyou/shiori-basic)
- [ShiolinkJS](https://github.com/Narazaka/shiolinkjs)
- [ShioriJK](https://github.com/Narazaka/shiorijk)
- [nostr-tools](https://github.com/nbd-wtf/nostr-tools)
- [ws](https://github.com/websockets/ws)
