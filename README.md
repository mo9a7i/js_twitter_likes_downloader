# js_twitter_likes_downloader
 scrapes your favorites, downloads the media, un-favorite
 

### Build the image
`$ docker build -t mo9a7i/js_twitter_likes_downloader .`   

### Remove running instances (if any)
`$ docker rm js_twitter_likes_downloader`   

### Run the new image
`$ docker run --name js_twitter_likes_downloader -d -v <local_folder>:<container_folder> mo9a7i/js_twitter_likes_downloader `   

