# js_docker_twitter_favorites_downloader
 scrapes your favorites, downloads the media, un-favorite


```bash
$ docker build -t mo9a7i/js_twitter_likes_downloader .
$ docker rm js_twitter_likes_downloader
$ docker run --name js_twitter_likes_downloader -d -v <local_folder>:<container_folder> mo9a7i/js_twitter_likes_downloader 
```