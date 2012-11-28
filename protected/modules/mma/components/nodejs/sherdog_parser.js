var argv = require('optimist').argv,
    CrawlerObject = require("crawler").Crawler,
    crawler = new CrawlerObject({
        maxConnections: 20
    }),

    fs = require('fs'),
    url = require('url'),
    http = require('http'),
    spawn = require('child_process').spawn,

    async = require('async');


var parse = function(url, callback)
{
    crawler.queue([
        {
            uri: url,
            callback: callback
        }
    ]);
};


var mongo = {
    server: null,
    client: null,
    opened: false,
    getClient: function(callback)
    {
        var that = this;
        if (!this.server)
        {
            var mongodb = require('mongodb');
            that.server = new mongodb.Server("127.0.0.1", 27017, { auto_reconnect: true, w: 'majority' });
            that.client = new mongodb.Db('mma', that.server, {safe: true});
        }

        if (this.opened)
        {
            that.client.open(function(err, p_client)
            {
                this.opened = true;
                callback(that.client);
            });
        }
        else
        {
            callback(that.client);
        }
    }
};

var done = function()
{
    for (var i in parsers)
    {
        if (parsers[i].enable && !parsers[i].is_done)
        {
            return true;
        }
    }
    process.exit(0);
};

var parsers = {
        sherdog_video: {
            base_url: 'http://www.sherdog.com',
            url: "/videos",
            enable: true,
            is_done: false,
            parser: function(error, result, $)
            {
                var video_links = $("div.content li h3.title a");
                var count = video_links.length;
                video_links.each(function(url)
                {
                    var url = parsers.sherdog_video.base_url + $(this).attr('href'),
                        id = url.split('-').pop(),
                        title = $.trim($(this).text());

                    //main parser
                    var parse_video = function(collection)
                    {
                        var video = {
                            title: title,
                            id: id
                        };

                        var save = function(gallery)
                        {
                            argv.v && console.log("insert video: \n", video);
                            //                                  collection.insert(gallery);
                            --count || ((parsers.sherdog_video.is_done = true) && done());
                        };


                        parse(url, function(error, result, $)
                        {
                            var src = $('.body_content iframe').attr('src');
                            if (src)
                            {
                                parse(src, function(error, result, $)
                                {
                                    video.url = $('meta[property="og:video"]').attr('content');
                                    save(video);
                                });
                            }
                            else
                            {
                                var html = $('.videoPlayer').parent().html();
                                var match = /.*"contentId":(\d+).*/gi.exec(html);
                                if (match[1])
                                {
                                    video.url = 'http://sherdog.springboardplatform.com/storage/sherdog.com/conversion/' + match[1] + '.mp4'
                                    save(video);
                                }
                                else
                                {
                                    console.log("can't parse url: " + url);
                                    --count || ((parsers.sherdog_video.is_done = true) && done());
                                }
                            }
                        });
                    };


                    //parser if in mongo we have no it
                    mongo.getClient(function(client)
                    {
                        client.collection('sherdog_video', function(err, collection)
                        {
                            collection.findOne({id: id}, function(err, item)
                            {
                                if (item)
                                {
                                    return true;
                                }
                                parse_video(collection);
                            });
                        });
                    });

                });

            }
        },
        sherdog_gallery: {
            base_url: 'http://www.sherdog.com',
            url: "/pictures",
            enable: true,
            is_done: false,
            parser: function(error, result, $)
            {
                var gallery_links = $("div.content li h3.title a");
                var count = gallery_links.length;
                gallery_links.each(function(url)
                {
                    var url = parsers.sherdog_gallery.base_url + $(this).attr('href'),
                        id = url.split('-').pop(),
                        title = $.trim($(this).text()),
                        counters = []; //contained count of non parsed images for each gallery

                    //main parser
                    var parse_gallery = function(collection)
                    {
                        var gallery = {
                            title: title,
                            id: id,
                            imgs: []
                        };

                        //parser image page
                        var img_page_parser = function(error, result, $)
                        {
                            var src = $('div.big_picture img').attr('src');
                            if (src)
                            {
                                gallery.imgs.push({
                                    title: $.trim($('div.picture_description').text()),
                                    url: src
                                });
                            }

                            if (--(counters[id]) == 0)
                            {
                                parsers.sherdog_gallery.download_files(gallery.imgs, function()
                                {
                                    argv.v && console.log("insert gallery: \n", gallery);
                                    --count || ((parsers.sherdog_gallery.is_done = true) && done());
                                });
                            }
                        };

                        //parser gallery page
                        var gallery_page_parser = function(error, result, $)
                        {
                            var img_pages = $('#photo_carousel a');
                            counters[id] = img_pages.length;

                            img_pages.each(function()
                            {
                                var img_page = parsers.sherdog_gallery.base_url + $(this).attr('href');
                                parse(img_page, img_page_parser);
                            });
                        };

                        parse(url, function(error, result, $)
                        {
                            var gallery_page = parsers.sherdog_gallery.base_url + $('div.content.img_list a:first').attr('href');
                            parse(gallery_page, gallery_page_parser);
                        });
                    };

                    //parser if in mongo we have no it
                    mongo.getClient(function(client)
                    {
                        client.collection('sherdog_gallery', function(err, collection)
                        {
                            collection.findOne({id: id}, function(err, item)
                            {
                                if (item)
                                {
                                    return true;
                                }

                                parse_gallery(collection);
                            });
                        });
                    });
                });
            },
            download_files: function(imgs, callback)
            {
                async.map(imgs, function(img)
                {
                    var file_name = url.parse(img.url).pathname.split('/').pop();
                    var file_path = '/tmp/' + file_name;
                    var file = fs.createWriteStream(file_path);
                    var curl = spawn('curl', [img.url]);
                    curl.stdout.on('data', function(data)
                    {
                        file.write(data);
                    });
                    curl.stdout.on('end', function(data)
                    {
                        argv.v && console.log('Download image: ' + file_path);
                        file.end();
                    });
                    curl.on('exit', function(code)
                    {
                        if (code != 0)
                        {
                            console.log('Failed: ' + code);
                        }
                    });
                }, callback);
            }
        }
    }
    ;

var page;
for (var i in parsers)
{
    page = parsers[i].base_url + parsers[i].url;
    if (parsers[i].enable)
    {
        (function(parser)
        { //contain non blocking code, need safe scope of variables
            parse(page, function(error, result, $)
            {
                parser.parser(error, result, $);
            });
        })(parsers[i]);
    }
}
