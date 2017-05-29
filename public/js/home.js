!function(){"use strict";var n="undefined"==typeof window?global:window;if("function"!=typeof n.require){var r={},t={},e={},o={}.hasOwnProperty,i="components/",a=function(n,r){var t=0;r&&(0===r.indexOf(i)&&(t=i.length),r.indexOf("/",t)>0&&(r=r.substring(t,r.indexOf("/",t))));var o=e[n+"/index.js"]||e[r+"/deps/"+n+"/index.js"];return o?i+o.substring(0,o.length-".js".length):n},u=/^\.\.?(\/|$)/,s=function(n,r){for(var t,e=[],o=(u.test(r)?n+"/"+r:r).split("/"),i=0,a=o.length;a>i;i++)t=o[i],".."===t?e.pop():"."!==t&&""!==t&&e.push(t);return e.join("/")},l=function(n){return n.split("/").slice(0,-1).join("/")},f=function(r){return function(t){var e=s(l(r),t);return n.require(e,r)}},c=function(n,r){var e={id:n,exports:{}};return t[n]=e,r(e.exports,f(n),e),e.exports},p=function(n,e){var i=s(n,".");if(null==e&&(e="/"),i=a(n,e),o.call(t,i))return t[i].exports;if(o.call(r,i))return c(i,r[i]);var u=s(i,"./index");if(o.call(t,u))return t[u].exports;if(o.call(r,u))return c(u,r[u]);throw new Error('Cannot find module "'+n+'" from "'+e+'"')};p.alias=function(n,r){e[r]=n},p.register=p.define=function(n,t){if("object"==typeof n)for(var e in n)o.call(n,e)&&(r[e]=n[e]);else r[n]=t},p.list=function(){var n=[];for(var t in r)o.call(r,t)&&n.push(t);return n},p.brunch=!0,p._cache=t,n.require=p}}(),require.register("configuration",function(n,r,t){var e=function(n){var r=new RegExp("/\\*(.|[\r\n])*?\\*/","g"),t=new RegExp("(^[/]|[^:]/)/.*[\r|\n]","g");return n=n.replace(t,""),n=n.replace(r,"")},o=function(n,r,t){if(n){var e=null,o=r.split("=");if(2==o.length){if(n[o[0]]==o[1])return n}else e=n[r];if("undefined"!=typeof e)return e}return t},i=function(){var n=window.location.pathname.split("/"),r="";if(n.length>0)for(var t=0;t<n.length;t++)"sec"!==n[t]&&""!==n[t]&&"index.html"!==n[t]&&(r=r+"/"+n[t]);return r+"/ngeo"},a={url:"../conf",baseServerUrl:i(),serverHostName:window.location.protocol+"//"+window.location.host,localConfig:null,data:{},load:function(){var n={};return $.when($.ajax({url:this.url+"/localConfiguration.json",dataType:"json",success:function(n){a.localConfig=n},error:function(n,r,t){console.log("Local configuration not found "+r+" "+t)}}),$.when($.ajax({url:this.url+"/configuration.json",dataType:"text",success:function(n){a.setConfigurationData(n)},error:function(n,r,t){console.log("Configuration not found "+r+" "+t)}}),$.ajax({url:this.serverHostName+this.baseServerUrl+"/webClientConfigurationData",dataType:"text",success:function(r){n=r},error:function(n,r,t){console.log("Configuration not found "+r+" "+t)}})).then(function(){a.buildServerConfiguration(n)}))},setConfigurationData:function(n){a.data=JSON.parse(e(n))},buildServerConfiguration:function(n){n=JSON.parse(e(n)),$.extend(!0,a.data,n)},get:function(n,r){return this.data?this.getFromPath(this.data,n,r):r},getMappedProperty:function(n,r,t){var e=this.getFromPath(this.localConfig,"serverPropertyMapper."+r);if(e){var o=this.getFromPath(n,e,t);return"browses"!=r||_.isArray(o)||(o=[o]),o}return t},setMappedProperty:function(n,r,t){var e=this.getFromPath(this.localConfig,"serverPropertyMapper."+r);if(e){var o=e.substr(e,e.lastIndexOf(".")),i=e.substr(e.lastIndexOf(".")+1),a=this.getFromPath(n,o,null);a?a[i]=t:console.warn(o+" doesn't exist")}else console.warn(r+" wasn't found in serverPropertyMapper")},getFromPath:function(n,r,t){for(var e=r.split("."),i=n,a=0;i&&a<e.length-1;a++){var u=e[a].split("[]");if(2===u.length){for(var s=null,l=0;l<i[u[0]].length;l++){for(var s=i[u[0]][l],f=a+1;s&&f<e.length-1;f++)s=o(s,e[f]);if(s){a=f;break}}i=s}else i=o(i,e[a])}return o(i,e[e.length-1],t)}};t.exports=a}),require.register("home",function(n,r,t){"use strict";var e=r("configuration");t.exports={initialize:function(n){e.url=n?n:"conf",e.load().done(function(){$("body .contactUs").attr("href","mailto:"+e.get("mailto")),$("body footer").append("<span>Client "+e.localConfig.version+" - Server "+e.data.version+"</span>")})}}});
//# sourceMappingURL=home.js.map