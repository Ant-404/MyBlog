# 本地音乐目录

可以继续向这里放入音乐。推荐文件名 `歌手 - 歌名.mp3`；可放同名封面，或 `cover.jpg` 作为默认封面。支持 MP3、WAV、OGG、M4A、AAC、FLAC、OPUS、WEBM，浏览器支持因格式而异。

更方便的方式是到后台 `/admin/music` 上传歌曲、编辑歌名/歌手和替换封面。后台上传后立即生效，文件和资料保存在后端音乐目录（默认 uploads/music），无需重新构建。此目录中的原歌曲不会因编辑资料被修改。

生产部署设置 MUSIC_SOURCE_DIRECTORY 指向已有音频目录；新上传内容用 MUSIC_DIRECTORY 指定保存位置。备份时保留音乐目录内的音频、封面和 library.json。详见 docs/leisure.md。
