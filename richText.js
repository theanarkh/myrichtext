        (function($){
            
            var richText=function(config){
                this.uploadImgUrl=config.uploadImgUrl ? config.uploadImgUrl : "http://localhost/upload.php"
                this.failCount=config.failCount ? (config.failCount-1) : 4;
                this.target=$(config.id);
                this.transfer=config.transfer ? config.transfer : {
                        " ": "&nbsp;",
                        ">": "&gt;",
                        "<": "&lt;",
                        "\n": "<br/>",
                        "&": "&amp;"
                };
                
                config.submit && this.bindSubmit(config.submit);
                this.range=undefined;
                this.operationType="";
                this.initConfig({
                    attachment:config.attachment,
                    insertImg:config.insertImg
                });

                this.initUpload();
                this.initRange()
                this.bindPaste();
                this.watchNodeInsert();

            }
            richText.prototype.bindSubmit=function(Config){
                var submitConfig={
                    text:"提交",
                    position:"right",
                    id:"submit",
                    className:""
                };
                $.extend(submitConfig,Config);
                var html="<button type='button' id='@id' class='@class'>@text</button>".replace(/@id|@text|@class/g,function(str){
                    var transfer={
                        "@id":submitConfig.id,
                        "@text":submitConfig.text,
                        "@class":submitConfig.className,
                    }
                    return transfer[str];
                })
                
                $(html).insertAfter(this.target).click($.proxy(function(){
                    console.log(this.beforeSubmit())
                },this));

            }
            richText.prototype.initConfig=function(config){
                var type;
                var attachment=config.attachment;
                var insertImg=config.insertImg;
                var self=this;
                if(attachment){
                    type=new RegExp(".jpg|.png|.jpeg|.gif|.doc|.docx|.xls|.zip|.rar|.7z","i");
                    this.attachmentConfig={
                        type:type,
                        size:10*1024*1024,
                        text:"上传附件",
                        id:"richTextAttachment"
                    };
                    attachment.type && (attachment.type=new RegExp("."+attachment.type.split(",").join("|."),"i"))
                    
                    $.extend(this.attachmentConfig,attachment);
                }
                
                 if(insertImg){
                    type=new RegExp(".jpg|.png|.jpeg|.gif","i");
                    this.insertImgConfig={
                        type:type,
                        size:10*1024*1024,
                        text:"插入图片",
                        id:"richTextInsertImg"
                    };
                    insertImg.type && (insertImg.type=new RegExp("."+insertImg.type.split(",").join("|."),"i"))
                    insertImg.insertNode=function(data){
                        window.getSelection && self.insertNodes(window.getSelection(), "insert",'<img  src="' + data.url + '"data-url="'+data.url+'"/>');
                        self.fixCursor();
                    }
                    $.extend(this.insertImgConfig,config.insertImg);

                }
            }
            richText.prototype.initUpload=function(){
                var str='<div class="richTextUpload" style="overflow:auto;">';
                var Tpl='<button type="button" id="@id">@text</button>'+
                    '        <form action="'+this.uploadImgUrl+'" method="post" enctype="multipart/form-data">'+
                             '<input type="file" name="@name">'+
                             '</form>';
                var attachment=false;
                var insertImg=false;

                if(this.attachmentConfig){
                    str+=Tpl.replace(/@id/,this.attachmentConfig.id).replace(/@text/,this.attachmentConfig.text).replace(/@name/,"attachment")
                    attachment=true;
                }
                if(this.insertImgConfig){
                    str+=Tpl.replace(/@id/,this.insertImgConfig.id).replace(/@text/,this.insertImgConfig.text).replace(/@name/,"insertImg")
                    insertImg=true;
                }
                str+="</div>";
                
                    (attachment || insertImg) && $(str).insertBefore(this.target);
                    attachment && (this.attachment=$('input[name="attachment"]')) && $(".richTextUpload").find('button').eq(0).click($.proxy(function(){
                        this.attachment.trigger("click")
                    },this))
                    insertImg && (this.insertImg=$('input[name="insertImg"]')) && $(".richTextUpload").find("button").eq(1).click($.proxy(function(){
                        this.insertImg.trigger("click")
                    },this))
                    
                    this.bindUpload();

            }
            richText.prototype.bindUpload=function(){
                var self=this;
                this.attachment && this.attachment.change(function(e){
                    if(e.target.value==""){
                        return;
                    }
                    var result=self.checkFile("attachmentConfig",e.target);
                    var flag=0;
                    !result.type && (flag=1,result.size=true) && self.attachmentConfig.fail && self.attachmentConfig.fail({errorMsg:"文件类型有误"});
                    !result.size && (flag=1) && self.attachmentConfig.fail && self.attachmentConfig.fail({errorMsg:"文件大小超过"+self.acceptFileSize+"M限制"}); 
                    !flag && self.submit(e.target);
                })

                self.insertImg && self.insertImg.change(function(e){
                    if(e.target.value==""){
                        return;
                    }
                    var result=self.checkFile("insertImgConfig",e.target);
                    var flag=0;

                    !result.type && (flag=1,result.size=true) && self.insertImgConfig.fail && self.insertImgConfig.fail({errorMsg:"文件类型有误"});
                    !result.size && (flag=1) && self.insertImgConfig.fail && self.insertImgConfig.fail({errorMsg:"文件大小超过"+self.acceptFileSize+"M限制"}); 
                    !flag && self.submit(e.target);
                })
            }
            richText.prototype.submit=function(target){
                var self=this;
                var time=new Date().getTime();
                var targetConfig;
                var iframeTpl='<iframe style="display:none" name="iframe'+time+'"></iframe>';
                
                if(target.name=='attachment'){
                    (!this.attachmentConfig.form && (this.attachmentConfig.form=$(target).parent('form')),targetConfig='attachmentConfig',false) || this.attachmentConfig.form.attr("target","iframe"+time);
                
                }
                if(target.name=='insertImg'){
                    (!this.insertImgConfig.form && (this.insertImgConfig.form=$(target).parent('form')),targetConfig='insertImgConfig',false) || this.insertImgConfig.form.attr("target","iframe"+time);;
                
                }
                
                var iframe=$(iframeTpl);
                
                iframe[0].callback=function(ret){
                    
                    if (ret && ret.code == 0) {
                        self[targetConfig].insertNode && self[targetConfig].insertNode(ret.data)
                        self[targetConfig].success && self[targetConfig].success(ret.data);
                    }
                    else {
                        self[targetConfig].fail && self[targetConfig].fail(ret.data);
                    }
                }
                $(document.body).append(iframe);
                self[targetConfig].form.submit()
                
                
            }
            richText.prototype.checkFile=function(configType,target){
                var fileType="."+target.value.split(/\/|\\/).pop().split(".")[1];
                var size=target.files ? target.files[0].size<this[configType].size :true
                return { 
                        type : this[configType].type.test(fileType),
                        size :size
                       }
                       
            }
            richText.prototype.initRange=function() {
                    var self=this;
                        self.target.on("click  keyup", function(e) {
                           
                            if(!window.getSelection){
                                return;
                            }
                            self.range = window.getSelection().getRangeAt(0).cloneRange();
                        })
            };

            richText.prototype.bindPaste=function(){
                var self = this;
                self.target.on("paste", function(e) {
                   
                    var event = e.originalEvent.clipboardData ? e.originalEvent.clipboardData : window.clipboardData;
                    var txt = /trident/i.test(navigator.userAgent) ? event.getData("Text") : event.getData("text/plain");
                    if (txt != "" && txt != null) { //ie下粘贴图片时会返回null
                        txt = txt.replace(/( |>|<|\n|&)/g, function(a, b) {
                            return self.transfer[b];
                        })
                        self.insertNodes(window.getSelection && window.getSelection(), "paste", txt)
                        e.preventDefault()
                        return;
                    }
                    self.operationType = "paste"
                        //针对chrome,opera处理,ie,firefox浏览器会自己粘贴图片
                    if (event && event.items && event.items[0] && event.items[0].getAsFile() && FileReader) {
                        content = event.items[0].getAsFile();
                        var file = new FileReader();
                        file.onload = function(e) {
                            var selection = window.getSelection();
                            var rg = selection.getRangeAt(0);
                            var fragment = rg.createContextualFragment("<img src='" + e.target.result + "'/>");
                            var oLastNode = fragment.lastChild;
                            rg.insertNode(fragment);
                            rg.setEndAfter(oLastNode); //设置末尾位置  
                            rg.collapse(false); //合并范围至末尾  
                            selection.removeAllRanges(); //清除range  
                            selection.addRange(rg); //设置range  
                            self.target.focus(); //解决火狐下无法自动获取焦点问题
                        }
                        file.readAsDataURL(content);
                    }
                })
            }
            richText.prototype.watchNodeInsert=function() {
                var self = this;
                self.target.on("DOMNodeInserted", function(e) {
                
                    if (self.operationType == "paste" && e.target.nodeName.toLowerCase() == "img") {
                        if (window.atob && ArrayBuffer && Uint8Array && Blob && FormData) {
                            var time = new Date().getTime();
                            var img = $(e.target);
                            img.attr('id', "pasteItem" + time);
                            var src = img.attr("src");
                            var type = src.match(/data:(.*);base64,/)[1];
                            var imageData = src.replace(/data.*?base64,/, "");

                            var bytes = window.atob(imageData); //去掉url的头，并转换为byte
                            //处理异常,将ascii码小于0的转换为大于0
                            var sendData = new ArrayBuffer(bytes.length);
                            var ptr = new Uint8Array(sendData);
                            for (var i = 0; i < bytes.length; i++) {
                                ptr[i] = bytes.charCodeAt(i);
                            }
                            var content = new Blob([sendData], {
                                "type": type
                            });
                            self.operationType = ""
                            self.submitFormData(content, time, self.failCount);
                        }
                    }

                })
            }
            richText.prototype.submitFormData= function(content, time, failCount) {
                var formData = new FormData();
                var self=this;
                formData.append("uploadfile", content, time + "." + content.type.substring(6));
                formData.append("type", "paste");
                formData.append("fileId", time);
                $.ajax({
                    url: this.uploadImgUrl+"?isPaste=true",
                    type: "post",
                    data: formData,
                    success: function(data) {
                        var data = $.parseJSON(data);

                        if (data.code != 0) {
                            if (failCount-- > 0) {
                                self.submitFormData(content, time, failCount);
                            } else {
                                alert(data.data ? data.data.msg : "上传图片出错");
                                $("#pasteItem" + time).remove();
                            }

                        } else {
                            $("#pasteItem" + time).attr("data-url", data.data.url.replace(/\?sign=[a-zA-Z0-9=\/+]*/g, ""));
                        }
                    },
                    fail: function(data) {
                        alert(data.data ? data.data.msg : "上传图片出错")
                    },
                    xhrFields: {
                        withCredentials: true
                    },
                    processData: false,
                    contentType: false
                })
            }
            richText.prototype.insertNodes= function(selection, eventType, insertStr) {
                
                var range;
                if (eventType == "insert") {
                    range = this.range;
                    if (range == undefined) {
                        this.target.focus();
                        range = this.range = selection.getRangeAt(0).cloneRange()
                    }
                } else if (eventType == "paste") {
                    range = selection.getRangeAt(0);
                    //range=this.rangeManage.range=selection.getRangeAt(0).cloneRange()
                }


                if(!range.createContextualFragment){//ie9支持window.getSelection,但不支持此属性,所以修复此属性
                     range.constructor.prototype.createContextualFragment=function(html){
                             var frag = document.createDocumentFragment(),  
                             div = document.createElement("div");
                             frag.appendChild(div);
                             div.outerHTML = html;
                             return frag;
                        };
                    
                }
                var fragment = range.createContextualFragment(insertStr);
                var oLastNode = fragment.lastChild; //lastChild; 


                range.insertNode(fragment);
                range.setEndAfter(oLastNode); //设置末尾位置  
                range.collapse(false); //合并范围至末尾  
                selection.removeAllRanges(); //清除range  
                //range.deleteContents()
                selection.addRange(range); //设置range  
            }
            richText.prototype.fixCursor= function() {
                if (window.getSelection) {
                    this.target.focus();
                    var selection = window.getSelection();
                    selection.selectAllChildren(this.target[0])
                    selection.collapseToEnd();
                    this.range = selection.getRangeAt(0).cloneRange();
                }
            }
            richText.prototype.replaceFunction={
                replaceEnter:function(str){
                    return  str.replace(/<br\/>|<br>|<br><\/br>|<p>([\s\S]*?)<\/p>|<div>([\s\S]*?)<\/div>/g, function(a, b, c) {
                        var x= ( b != undefined ) ? b : c;
                        if (a == "<br>" || a == "<br/>" || a == "<br><br\/>") {
                            return "[br]";
                        } else {
                            if("<br>"==b || "<br/>"==b ||"<br></br>"==b){
                                return "[br]";
                            }
                            return x + "[br]";
                        }
                    })
                },
                replaceA:function(str){
                    return str.replace(/<a([\s\S]*?)href=['"]([\s\S]*?)['"]([\s\S]*?)>([\s\S]*?)<\/a>/g, function(a, b, href, c, d) {
                        return href;
                    })
                },
                deleteLabel:function(str){
                    return str.replace(/<\/?[\s\S]+?>/g,"");
                },
                replaceUrl:function(str){
                    return str.replace( /([^=]|^)((http:\/\/|https:\/\/|ftp:\/\/)([\w\d\-]+\.){1,3}([\s\S]+?))($|\s|\[|&nbsp;)/ig, function(a, g,url, b, c, d, e) {
                        return g+"[a href=" + url + "]" + e;
                    })  
                }

            }
            richText.prototype.beforeSubmit=function(){
                var commemt_text = this.target.html().replace(/\n/g, "").replace(/<img[\s\S]*?>/g, function(a) {
                    return "[" + a.substring(1, a.length - 1) + "]"
                }).replace((/\[img[\s\S]*?data-url="([\s\S]*?)"[\s\S]*?\]/g), function(a, dataUrl) {
                    return "[img src=" + dataUrl + "]";
                }).replace(/<br\/>|<br>|<br><\/br>|<p>([\s\S]*?)<\/p>|<div>([\s\S]*?)<\/div>/g, function(a, b, c) {
                    var x= ( b != undefined ) ? b : c;
                    if (a == "<br>" || a == "<br/>" || a == "<br><br\/>") {
                        return "[br]";
                    } else {
                        if("<br>"==b || "<br/>"==b ||"<br></br>"==b){
                            return "[br]";
                        }
                        return x + "[br]";
                    }
                }).replace(/<a([\s\S]*?)href=['"]([\s\S]*?)['"]([\s\S]*?)>([\s\S]*?)<\/a>/g, function(a, b, href, c, d) {
                        return href;
                }).replace(/<\/?[\s\S]+?>/g,"").replace( /([^=]|^)((http:\/\/|https:\/\/|ftp:\/\/)([\w\d\-]+\.){1,3}([\s\S]+?))($|\s|\[|&nbsp;)/ig, function(a, g,url, b, c, d, e) {
                    return g+"[a href=" + url + "]" + e;
                })  
                return commemt_text;
            }
            this.richText=richText;
        
        }).call(this,$)
