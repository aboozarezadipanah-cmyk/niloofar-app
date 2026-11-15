(function(){
var $=function(s){return document.querySelector(s)};
var K='bk_admin_v1',ST=['در انتظار','در حال آماده‌سازی','ارسال شد','تحویل شد','لغو شد'];
var S={cats:[],products:[],orders:[],settings:{},pages:{},stats:{}};
var auth=false,role='';
function api(m,u,b){return fetch(u,{method:m,headers:b?{'Content-Type':'application/json'}:{},body:b?JSON.stringify(b):undefined,credentials:'same-origin'}).then(function(r){return r.json().catch(function(){return {}}).then(function(j){if(!r.ok)throw new Error(j.error||'خطا در ارتباط با سرور');return j})})}
function loadAdmin(){return api('GET','/api/admin/state').then(function(d){S.orders=d.orders;S.cats=d.cats;S.products=d.products;S.settings=d.settings||{};S.pages=d.pages||{};S.stats=d.stats||{};var ae=document.activeElement;if(location.hash==='#admin'&&!(ae&&/^(INPUT|TEXTAREA|SELECT)$/.test(ae.tagName)&&$('#adm').contains(ae)))render()})}
var tab='home',edit=null,imgs=[],eo=0,err='';
var svt=0;function save(){clearTimeout(svt);svt=setTimeout(function(){api('PUT','/api/admin/catalog',{cats:S.cats,products:S.products,settings:S.settings}).catch(function(e){alert('ذخیره نشد: '+e.message)})},300)}
function fa(n){return (+n||0).toLocaleString('fa-IR')}
function esc(s){return String(s==null?'':s).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]})}
function uid(){return Date.now().toString(36)+Math.random().toString(36).slice(2,5)}
function list(v){return String(v||'').split(/[,،]/).map(function(x){return x.trim()}).filter(Boolean)}
function pimg(p){return p.img?'<img alt="" src="'+p.img+'">':'<div class="ph"></div>'}
function home(){
var ok=S.orders.filter(function(o){return o.status!==ST[4]});
var st0=S.stats||{},t0=st0.today||{},m0=st0.month||{},tp=st0.top||[];
var low=S.products.filter(function(p){return p.stock<=3}).length;
var cnt=ST.map(function(s){return S.orders.filter(function(o){return o.status===s}).length});var mx=Math.max.apply(null,cnt.concat([1]));
return '<div class="ag"><div class="ac"><small>فروش امروز</small><b>'+fa(t0.sales)+' تومان</b></div><div class="ac"><small>سفارش‌های امروز</small><b>'+fa(t0.orders)+'</b></div><div class="ac"><small>فروش این ماه</small><b>'+fa(m0.sales)+' تومان</b></div><div class="ac"><small>سفارش‌های این ماه</small><b>'+fa(m0.orders)+'</b></div><div class="ac"><small>پرداخت‌شده‌ی این ماه</small><b>'+fa(m0.paid)+' تومان</b></div><div class="ac"><small>در انتظار</small><b>'+fa(cnt[0])+'</b></div><div class="ac"><small>رو به اتمام (۳ تا یا کمتر)</small><b>'+fa(low)+'</b></div></div><h3>محصولات پرفروش</h3>'+(tp.length?tp.map(function(x,i){return '<div class="bar"><span style="width:180px">'+fa(i+1)+'. '+esc(x.name)+'</span>'+fa(x.q)+' عدد | '+fa(x.rev)+' تومان</div>'}).join(''):'<p>هنوز فروشی ثبت نشده.</p>')+'<h3>سفارش‌ها بر اساس وضعیت</h3>'+ST.map(function(s,i){return '<div class="bar"><span style="width:130px">'+s+'</span><i style="width:'+(cnt[i]/mx*60)+'%"></i>'+fa(cnt[i])+'</div>'}).join('')+(role==='o'?'<h3>بکاپ</h3><div class="at"><button class="ab" data-a="bk">گرفتن بکاپ در سرور</button><button class="ab" data-a="ex">دانلود فایل بکاپ</button></div><h3>دسترسی‌ها</h3><div class="fm"><input id="npw" type="password" placeholder="رمز جدید شما (خالی = بدون تغییر)" aria-label="رمز مدیر"><input id="np2" type="password" placeholder="رمز همکار (خالی = بدون دسترسی)" aria-label="رمز همکار"><button class="ab" data-a="pw">ذخیره‌ی رمزها</button></div>':'')}
function prods(){
if(edit!==null){var p=S.products.filter(function(x){return x.id===edit})[0]||{};
return '<h3>'+(p.id?'ویرایش محصول':'محصول جدید')+'</h3><div class="fm"><label>نام محصول<input id="f-n" value="'+esc(p.name)+'"></label><label>قیمت (تومان)<input id="f-p" type="number" min="0" value="'+(p.price||'')+'"></label><label>دسته<select id="f-c">'+S.cats.map(function(c){return '<option'+(c===p.cat?' selected':'')+'>'+esc(c)+'</option>'}).join('')+'</select></label><label>سایزها (با ویرگول جدا کنید)<input id="f-s" value="'+esc((p.sizes||[]).join('، '))+'"></label><label>رنگ‌ها (با ویرگول جدا کنید)<input id="f-k" value="'+esc((p.colors||[]).join('، '))+'"></label><label>موجودی<input id="f-t" type="number" min="0" value="'+(p.stock==null?'':p.stock)+'"></label><label>عکس‌های محصول (تا ۶ عکس، اولی عکس اصلی است)<input id="f-i" type="file" accept="image/*" multiple></label><div id="pv" class="gal">'+gal()+'</div><div class="at"><button class="ab p" data-a="sp">ذخیره</button><button class="ab" data-a="cx">انصراف</button></div>'+(err?'<p class="er">'+err+'</p>':'')+'</div>'}
return '<div class="at"><button class="ab p" data-a="np">افزودن محصول</button></div>'+(S.products.length?S.products.map(function(p){return '<div class="row">'+pimg(p)+'<div class="in"><b>'+esc(p.name)+'</b><small>'+esc(p.cat)+' | '+fa(p.price)+' تومان | موجودی: '+fa(p.stock)+(p.stock<=3?' (رو به اتمام)':'')+'</small><small>سایز: '+esc((p.sizes||[]).join('، ')||'-')+' | رنگ: '+esc((p.colors||[]).join('، ')||'-')+'</small></div><input style="width:120px" type="number" min="0" value="'+p.price+'" data-pr="'+p.id+'" aria-label="قیمت سریع"><button class="ab" data-a="ep" data-id="'+p.id+'">ویرایش</button><button class="ab d" data-a="dp" data-id="'+p.id+'">حذف</button></div>'}).join(''):'<p>هنوز محصولی اضافه نشده. با «افزودن محصول» شروع کنید.</p>')}
function ords(){
function row(o){
if(eo===o.id)return '<div class="row"><div class="fm" style="flex:1"><b>ویرایش سفارش '+fa(o.id)+'</b><label>نام<input id="o-n" value="'+esc(o.name)+'"></label><label>تلفن<input id="o-p" value="'+esc(o.phone)+'"></label><label>آدرس<textarea id="o-a" rows="2">'+esc(o.address)+'</textarea></label><label>کد رهگیری پست<input id="o-t" value="'+esc(o.track)+'"></label><label>یادداشت مدیر<textarea id="o-m" rows="2">'+esc(o.note)+'</textarea></label><div class="at"><button class="ab p" data-a="oe" data-id="'+o.id+'">ذخیره</button><button class="ab" data-a="co">انصراف</button></div></div></div>';
return '<div class="row"><div class="in"><b>سفارش '+fa(o.id)+'</b> <small>'+esc(o.date)+(o.paid?' | پرداخت‌شده ✓':' | پرداخت نشده')+'</small><small>مشتری: '+esc(o.name)+' | تلفن: '+esc(o.phone)+'</small><small>آدرس: '+esc(o.address)+'</small><small>'+o.items.map(function(i){return esc(i.n)+' × '+fa(i.q)}).join('، ')+'</small>'+(o.track?'<small>کد رهگیری: '+esc(o.track)+'</small>':'')+(o.note?'<small>یادداشت: '+esc(o.note)+'</small>':'')+'<b>'+fa(o.total)+' تومان</b></div><select data-os="'+o.id+'" aria-label="وضعیت سفارش" style="width:170px">'+ST.map(function(s){return '<option'+(s===o.status?' selected':'')+'>'+s+'</option>'}).join('')+'</select><button class="ab" data-a="eo" data-id="'+o.id+'">ویرایش</button></div>'}
return '<div class="at"><button class="ab" data-a="rf">به‌روزرسانی سفارش‌ها</button></div>'+(S.orders.length?S.orders.map(row).join(''):'<p>هنوز سفارشی ثبت نشده.</p>')}
function pgs(){var P=S.pages||{};return '<h3>متن صفحه‌ها</h3><p>بین پاراگراف‌ها یک خط خالی بگذارید.</p><div class="fm" style="max-width:640px"><label>درباره‌ی ما<textarea id="g-a" rows="6">'+esc(P.about)+'</textarea></label><label>قوانین و شرایط<textarea id="g-t" rows="6">'+esc(P.terms)+'</textarea></label><label>سوالات متداول<textarea id="g-f" rows="8">'+esc(P.faq)+'</textarea></label><button class="ab p" data-a="sp2">ذخیره</button></div>'}
function sets(){var s=S.settings||{};return '<h3>راه‌های ارتباطی</h3><div class="fm"><label>آیدی تلگرام<input id="s-tg" value="'+esc(s.tg)+'"></label><label>آیدی اینستاگرام<input id="s-ig" value="'+esc(s.ig)+'"></label><label>آیدی روبیکا<input id="s-rb" value="'+esc(s.rb)+'"></label><label>شماره‌ی تماس<input id="s-ph" value="'+esc(s.phone)+'"></label><button class="ab p" data-a="ss">ذخیره</button></div>'}
function cats(){
return '<div class="fm"><label>دسته‌ی جدید<input id="nc"></label><button class="ab p" data-a="ac">افزودن دسته</button></div><h3>دسته‌های فعلی</h3>'+S.cats.map(function(c,i){return '<div class="row"><div class="in">'+esc(c)+'</div><button class="ab d" data-a="dc" data-id="'+i+'">حذف</button></div>'}).join('')}
function render(){
var r=$('#adm');if(!r)return;
if(!auth){r.innerHTML='<form class="al" id="lf"><img alt="" src="'+document.querySelector('.seal').src+'"><h3>ورود به پنل مدیریت</h3><input id="lp" type="password" placeholder="رمز عبور" aria-label="رمز عبور"><button class="ab p" type="submit">ورود</button>'+(err?'<p class="er">'+err+'</p>':'')+'</form>';return}
var T=[['home','نمای کلی'],['prods','محصولات'],['ords','سفارش‌ها'],['cats','دسته‌ها'],['pg','صفحه‌ها'],['set','تنظیمات']];
r.innerHTML='<div class="at">'+T.map(function(t){return '<button data-t="'+t[0]+'" class="'+(tab===t[0]?'on':'')+'">'+t[1]+'</button>'}).join('')+'<span class="sp"></span><a class="ab" href="#" data-a="site">دیدن سایت</a><button data-a="out">خروج</button></div>'+({home:home,prods:prods,ords:ords,cats:cats,set:sets,pg:pgs}[tab])()}
var q='';
function card(p){return '<div class="pc"><a href="#p-'+p.id+'">'+(p.img?'<img alt="'+esc(p.name)+'" src="'+p.img+'">':'<div class="ph"></div>')+'<b>'+esc(p.name)+'</b><span>'+fa(p.price)+' تومان</span>'+(p.stock>0?'':'<small>ناموجود</small>')+'</a></div>'}
function shop0(){var m=location.hash.match(/^#cat-(.+)$/),t='همه‌ی محصولات',L=srt();
if(q){t='نتیجه‌ی جست‌وجو';var k=q.toLowerCase();L=L.filter(function(p){return (p.name+' '+p.cat+' '+(p.sizes||[]).join(' ')+' '+(p.colors||[]).join(' ')).toLowerCase().indexOf(k)>=0})}
else if(m&&m[1]!=='all'){t=S.cats[+m[1]]||'';L=L.filter(function(p){return p.cat===t})}
$('#shopv').innerHTML='<h2>'+esc(t)+'</h2>'+(L.length?'<div class="pg">'+L.map(card).join('')+'</div>':'<div class="empty">محصولی پیدا نشد.</div>')}
function menu(){$('#dl').innerHTML='<a href="#home">صفحه‌ی اصلی</a><a href="#cat-all">همه‌ی محصولات</a>'+S.cats.map(function(c,i){return '<a href="#cat-'+i+'">'+esc(c)+'</a>'}).join('')+'<a href="#size">راهنمای سایز</a><a href="#contact">تماس با ما</a><a href="#about">درباره‌ی ما</a><a href="#blog">بلاگ</a><a href="#track">پیگیری سفارش</a><a href="#faq">سوالات متداول</a><a href="#terms">قوانین و شرایط</a>';
var t=document.querySelector('.cats');if(t)t.innerHTML=S.cats.map(function(c,i){return '<a class="cat" href="#cat-'+i+'">'+esc(c)+'</a>'}).join('')}
var sk='n',fo=false,C=[];try{C=JSON.parse(localStorage.getItem('bk_cart'))||[]}catch(e){}
function srt(){var L=S.products.slice().reverse();if(sk==='a')L.sort(function(x,y){return x.price-y.price});if(sk==='d')L.sort(function(x,y){return y.price-x.price});return L}
function sc(){try{localStorage.setItem('bk_cart',JSON.stringify(C))}catch(e){}}
function cn(){var n=C.reduce(function(a,i){return a+i.q},0);$('#cc').textContent=n?fa(n):''}
function shop(){shop0();var h=$('#shopv h2');if(!h)return;h.insertAdjacentHTML('afterend','<div class="tb"><button class="ab" data-f="1">فیلترها</button><select id="so" aria-label="مرتب‌سازی">'+[['n','جدیدترین'],['a','ارزان‌ترین'],['d','گران‌ترین']].map(function(o){return '<option value="'+o[0]+'"'+(sk===o[0]?' selected':'')+'>'+o[1]+'</option>'}).join('')+'</select></div>'+(fo?'<div class="chs"><a class="ch" href="#cat-all">همه</a>'+S.cats.map(function(c,i){return '<a class="ch" href="#cat-'+i+'">'+esc(c)+'</a>'}).join('')+'</div>':''))}
function hm(){var L=S.products.slice().reverse();$('#bd').innerHTML='<div class="bi"><div class="bh"><h2>پیشنهاد ویژه</h2><a href="#cat-all">نمایش همه</a></div>'+(L[0]?card(L[0]):'<p>محصولات ویژه به‌زودی اینجا قرار می‌گیرند.</p>')+'</div>';
var n=$('#nw');if(n){if(L.length){n.className='pg';n.innerHTML=L.slice(0,4).map(card).join('')}else{n.className='empty';n.textContent='محصولات تازه به‌زودی اینجا قرار می‌گیرند.'}}cn()}
document.addEventListener('click',function(e){var b=e.target.closest('[data-add],[data-q],[data-f]');if(!b)return;
if(b.dataset.add){add(b.dataset.add);b.textContent='اضافه شد'}
else if(b.dataset.q){C.forEach(function(i){if((i.k||i.id)===b.dataset.q)i.q+=+b.dataset.d});C=C.filter(function(i){return i.q>0});sc();cn();cartv()}
else{fo=!fo;shop()}});
document.addEventListener('change',function(e){if(e.target.id==='so'){sk=e.target.value;shop()}});
$('#sb').addEventListener('click',function(){var r=$('#sr');r.hidden=!r.hidden;if(!r.hidden)$('#sq').focus()});
$('#xb').addEventListener('click',function(){closeDr()});
var psz='',pcl='',pid='';
function add(id,sz,cl){var p=S.products.filter(function(x){return x.id===id})[0];if(!p)return;var k=id+'|'+(sz||'')+'|'+(cl||''),i=C.filter(function(x){return x.k===k})[0];if(i)i.q++;else C.push({k:k,id:id,n:p.name,p:p.price,q:1,img:p.img||'',sz:sz||'',cl:cl||''});sc();cn()}
function opt(a,v,cur){return '<button class="ch'+(v===cur?' on':'')+'" data-o="'+a+'" data-v="'+esc(v)+'" aria-pressed="'+(v===cur)+'">'+esc(v)+'</button>'}
function pv(id){var p=S.products.filter(function(x){return x.id===id})[0];
if(!p){$('#shopv').innerHTML='<a class="bk" href="#cat-all">بازگشت به محصولات</a><div class="empty">محصول پیدا نشد.</div>';return}
if(pid!==id){pid=id;psz='';pcl=''}
$('#shopv').innerHTML='<a class="bk" href="#cat-all">بازگشت به محصولات</a><div class="pd">'+gl(p)+'<div><h2>'+esc(p.name)+'</h2><p class="pp">'+fa(p.price)+' تومان</p><small>'+esc(p.cat)+'</small>'+((p.sizes||[]).length?'<h4>سایز</h4><div class="chs">'+p.sizes.map(function(s){return opt('s',s,psz)}).join('')+'</div>':'')+((p.colors||[]).length?'<h4>رنگ</h4><div class="chs">'+p.colors.map(function(s){return opt('c',s,pcl)}).join('')+'</div>':'')+(p.stock>0?'<button class="ab p" data-pa="1">افزودن به سبد</button><p class="er" id="pe" role="alert"></p>':'<p>ناموجود</p>')+'</div></div>'}
document.addEventListener('click',function(e){var b=e.target.closest('[data-o],[data-pa]');if(!b)return;
if(b.dataset.o){if(b.dataset.o==='s')psz=b.dataset.v;else pcl=b.dataset.v;pv(pid);return}
var p=S.products.filter(function(x){return x.id===pid})[0];if(!p)return;
if(((p.sizes||[]).length&&!psz)||((p.colors||[]).length&&!pcl)){$('#pe').textContent='لطفاً سایز و رنگ را انتخاب کنید.';return}
add(pid,psz,pcl);b.textContent='اضافه شد ✓'});
function cartv(){var t=C.reduce(function(a,i){return a+i.p*i.q},0);$('#shopv').innerHTML='<h2>سبد خرید</h2>'+(C.length?C.map(function(i){var k=esc(i.k||i.id);return '<div class="row">'+(i.img?'<img alt="" src="'+i.img+'">':'<div class="ph"></div>')+'<div class="in"><b>'+esc(i.n)+'</b><small>'+fa(i.p)+' تومان'+(i.sz?' | سایز '+esc(i.sz):'')+(i.cl?' | '+esc(i.cl):'')+'</small></div><button class="ab" data-q="'+k+'" data-d="-1" aria-label="کم کردن">−</button><b>'+fa(i.q)+'</b><button class="ab" data-q="'+k+'" data-d="1" aria-label="زیاد کردن">+</button></div>'}).join('')+'<p><b>جمع: '+fa(t)+' تومان</b></p><form class="fm" id="cf"><label>نام و نام خانوادگی<input id="c-n" required autocomplete="name"></label><label>شماره‌ی تماس<input id="c-p" type="tel" inputmode="tel" required autocomplete="tel"></label><label>آدرس کامل<textarea id="c-a" rows="3" required autocomplete="street-address"></textarea></label><button class="ab p" type="submit">ثبت سفارش</button><p class="er" id="ce" role="alert"></p><small>بعد از ثبت سفارش، در صورت فعال بودن درگاه به صفحه‌ی پرداخت می‌روید؛ در غیر این صورت پرداخت هماهنگ می‌شود.</small></form>':'<div class="empty">سبد خرید خالی است.</div>')}
document.addEventListener('submit',function(e){if(e.target.id!=='cf')return;e.preventDefault();
var n=$('#c-n').value.trim(),ph=$('#c-p').value.trim(),a=$('#c-a').value.trim(),d=ph.replace(/[۰-۹]/g,function(x){return '۰۱۲۳۴۵۶۷۸۹'.indexOf(x)}).replace(/\D/g,'');
if(!n||!a||d.length<10){$('#ce').textContent='نام، شماره‌ی تماس معتبر و آدرس را کامل وارد کنید.';return}
var bt=$('#cf button[type=submit]');bt.disabled=true;
api('POST','/api/orders',{name:n,phone:ph,address:a,items:C.map(function(i){return {id:i.id,sz:i.sz||'',cl:i.cl||'',q:i.q}})}).then(function(r){
C=[];sc();cn();if(r.payUrl){location.href=r.payUrl;return}
$('#shopv').innerHTML='<h2>سفارش شما ثبت شد</h2><p>شماره‌ی سفارش: '+fa(r.id)+'</p><p>مبلغ: '+fa(r.total)+' تومان</p><p>'+(r.payError?'اتصال به درگاه پرداخت برقرار نشد. ':'')+'برای هماهنگی پرداخت با شما تماس گرفته می‌شود.</p><a class="bk" href="#home">بازگشت به صفحه‌ی اصلی</a>';
api('GET','/api/store').then(function(d){S.products=d.products}).catch(function(){})
}).catch(function(x){bt.disabled=false;$('#ce').textContent=x.message})});
function res(h){var ok=/^#paid-/.test(h),id=h.replace(/^#\w+-/,'');$('#shopv').innerHTML=ok?'<h2>پرداخت موفق بود ✓</h2><p>سفارش شماره‌ی '+fa(id)+' ثبت و پرداخت شد. ممنون از خرید شما.</p><a class="bk" href="#home">بازگشت به صفحه‌ی اصلی</a>':'<h2>پرداخت انجام نشد</h2><p>سفارش شماره‌ی '+fa(id)+' ثبت شده ولی پرداخت کامل نشد. می‌توانید با ما تماس بگیرید.</p><a class="bk" href="#home">بازگشت به صفحه‌ی اصلی</a>'}
function ctt(){var c=$('#ct'),s=S.settings||{},L=[];function xi(v){return String(v||'').replace(/^https?:\/\/[^\/]+\//,'').replace(/^@/,'').replace(/[^\w.]/g,'')}
if(xi(s.tg))L.push(['تلگرام','https://t.me/'+xi(s.tg)]);if(xi(s.ig))L.push(['اینستاگرام','https://instagram.com/'+xi(s.ig)]);if(xi(s.rb))L.push(['روبیکا','https://rubika.ir/'+xi(s.rb)]);if(s.phone)L.push(['تماس: '+s.phone,'tel:'+String(s.phone).replace(/[^\d+]/g,'')]);
if(c&&L.length){c.className='chs';c.innerHTML=L.map(function(x){return '<a class="ch" target="_blank" rel="noopener" href="'+esc(x[1])+'">'+esc(x[0])+'</a>'}).join('')}}
function boot(){var d=function(){route()};api('GET','/api/store').then(function(x){S.cats=x.cats;S.products=x.products;S.settings=x.settings||{};S.pages=x.pages||{}}).catch(function(){}).then(d);api('GET','/api/me').then(function(x){if(x.role){role=x.role==='owner'?'o':'s';auth=true;return loadAdmin()}}).catch(function(){})}
function txt(s){return esc(s).split(/\n{2,}/).map(function(p){return '<p>'+p.replace(/\n/g,'<br>')+'</p>'}).join('')}
function pgf(){var P=S.pages||{};['about','terms','faq'].forEach(function(k){var c=$('#pg-'+k);if(c)c.innerHTML=P[k]?txt(P[k]):'<p>به‌زودی اینجا قرار می‌گیرد.</p>'})}
function gl(p){var im=p.images&&p.images.length?p.images:(p.img?[p.img]:[]);if(!im.length)return '<div class="ph"></div>';return '<div><img id="pm" alt="'+esc(p.name)+'" src="'+esc(im[0])+'">'+(im.length>1?'<div class="th">'+im.map(function(u){return '<button type="button" class="tb2" data-g="'+esc(u)+'" aria-label="نمایش عکس"><img alt="" src="'+esc(u)+'"></button>'}).join('')+'</div>':'')+'</div>'}
document.addEventListener('click',function(e){var b=e.target.closest('[data-g]');if(b){var m=$('#pm');if(m)m.src=b.dataset.g}});
document.addEventListener('submit',function(e){if(e.target.id!=='tf')return;e.preventDefault();api('GET','/api/track?id='+encodeURIComponent($('#t-i').value)+'&phone='+encodeURIComponent($('#t-p').value)).then(function(r){$('#tr').innerHTML='<p><b>وضعیت: '+esc(r.status)+'</b></p><p>'+(r.paid?'پرداخت شده ✓':'پرداخت نشده')+'</p>'+(r.track?'<p>کد رهگیری پست: <b>'+esc(r.track)+'</b></p>':'')}).catch(function(x){$('#tr').innerHTML='<p class="er">'+esc(x.message)+'</p>'})});
function closeDr(){$('#dr').hidden=true;$('#hb').setAttribute('aria-expanded','false')}
function route(){var h=location.hash,b=document.body,sh=!!q||/^#(cat-|cart|p-|paid-|failed-)/.test(h);closeDr();menu();hm();ctt();pgf();
b.classList.toggle('isadm',h==='#admin');b.classList.toggle('isshop',sh&&h!=='#admin');
if(h==='#admin')render();else if(sh){(q?shop:h==='#cart'?cartv:/^#p-/.test(h)?function(){pv(h.slice(3))}:/^#(paid|failed)-/.test(h)?function(){res(h)}:shop)();scrollTo(0,0)}else{var pg={'#about':'about','#blog':'blog','#contact':'contact','#size':'size','#terms':'terms','#faq':'faq','#track':'track'}[h]||'home';document.querySelectorAll('main>[data-p]').forEach(function(n){n.classList.toggle('off',n.dataset.p!==pg)});scrollTo(0,0)}}
function onHash(){q='';$('#sq').value='';route()}
addEventListener('hashchange',onHash);boot();
$('#sq').addEventListener('input',function(){q=this.value.trim();if(q){document.body.classList.add('isshop');shop()}else route()});
$('#hb').addEventListener('click',function(){var o=$('#dr').hidden;$('#dr').hidden=!o;this.setAttribute('aria-expanded',o?'true':'false')});
$('#ov').addEventListener('click',closeDr);$('#dl').addEventListener('click',function(e){if(e.target.tagName==='A')closeDr()});
addEventListener('keydown',function(e){if(e.key==='Escape')closeDr()});
var tp=0,tt;$('#sec').addEventListener('click',function(){tp++;clearTimeout(tt);tt=setTimeout(function(){tp=0},2500);if(tp>=5){tp=0;location.hash='#admin'}});
function shrink(f,cb){var rd=new FileReader();rd.onload=function(){var im=new Image();im.onload=function(){var s=Math.min(1,1000/Math.max(im.width,im.height)),c=document.createElement('canvas');c.width=Math.round(im.width*s);c.height=Math.round(im.height*s);c.getContext('2d').drawImage(im,0,0,c.width,c.height);c.toBlob(function(b){cb(b)},'image/jpeg',.82)};im.onerror=function(){cb(null)};im.src=rd.result};rd.readAsDataURL(f)}
function gal(){return imgs.map(function(u,i){return '<span class="gi"><img alt="" src="'+esc(u)+'" width="70"><button type="button" class="ab" data-a="ri" data-id="'+i+'" aria-label="حذف عکس">✕</button>'+(i?'<button type="button" class="ab" data-a="mi" data-id="'+i+'">اصلی</button>':'<small>اصلی</small>')+'</span>'}).join('')}
document.addEventListener('change',function(e){var t=e.target;
if(t.id==='f-i'&&t.files.length){var fl=[].slice.call(t.files).slice(0,6-imgs.length);$('#pv').insertAdjacentHTML('beforeend','<small>در حال بارگذاری…</small>');
fl.reduce(function(pr,f){return pr.then(function(){return new Promise(function(ok){shrink(f,function(b){if(!b)return ok();fetch('/api/admin/upload',{method:'POST',headers:{'Content-Type':'image/jpeg'},body:b,credentials:'same-origin'}).then(function(r){return r.json()}).then(function(j){if(j.url&&imgs.length<6)imgs.push(j.url);else if(j.error)alert(j.error)}).catch(function(){alert('بارگذاری عکس ناموفق بود')}).then(ok)})})})},Promise.resolve()).then(function(){var p2=$('#pv');if(p2)p2.innerHTML=gal();t.value=''})}
if(t.dataset&&t.dataset.os){S.orders.forEach(function(o){if(String(o.id)===t.dataset.os)o.status=t.value});api('PUT','/api/admin/orders/'+t.dataset.os,{status:t.value}).catch(function(x){alert(x.message)})}
if(t.dataset&&t.dataset.pr){S.products.forEach(function(p){if(p.id===t.dataset.pr)p.price=+t.value||0});save()}});
document.addEventListener('submit',function(e){if(e.target.id!=='lf')return;e.preventDefault();
api('POST','/api/login',{password:$('#lp').value}).then(function(d){auth=true;role=d.role==='owner'?'o':'s';err='';return loadAdmin()}).catch(function(x){err=x.message;auth=false}).then(function(){render()})});
document.addEventListener('click',function(e){var b=e.target.closest('[data-t],[data-a]');if(!b||!$('#adm').contains(b))return;
if(b.dataset.t){tab=b.dataset.t;edit=null;err='';render();if(auth)loadAdmin();return}
var a=b.dataset.a,id=b.dataset.id;
if(a==='site'){return}
e.preventDefault();
if(a==='out'){auth=false;role='';api('POST','/api/logout',{}).catch(function(){})}
if(a==='np'){edit='';imgs=[];err=''}
if(a==='ep'){edit=id;imgs=((S.products.filter(function(p){return p.id===id})[0]||{}).images||[]).slice();err=''}
if(a==='cx'){edit=null}
if(a==='dp'&&confirm('این محصول حذف شود؟')){S.products=S.products.filter(function(p){return p.id!==id});save()}
if(a==='sp'){var n=$('#f-n').value.trim(),pr=+$('#f-p').value;
if(!n||!(pr>=0)||$('#f-p').value===''){err='نام و قیمت را وارد کنید.'}else{var o={id:edit||uid(),name:n,price:pr,cat:$('#f-c').value,sizes:list($('#f-s').value),colors:list($('#f-k').value),stock:+$('#f-t').value||0,images:imgs.slice(),img:imgs[0]||''};
var i=S.products.map(function(p){return p.id}).indexOf(o.id);if(i<0)S.products.push(o);else S.products[i]=o;save();edit=null;err=''}}
if(a==='ri'){imgs.splice(+id,1);$('#pv').innerHTML=gal();return}
if(a==='mi'){var m1=imgs.splice(+id,1)[0];imgs.unshift(m1);$('#pv').innerHTML=gal();return}
if(a==='eo'){eo=+id}
if(a==='co'){eo=0}
if(a==='oe'){var oo=S.orders.filter(function(x){return x.id===+id})[0];if(oo){var pt={name:$('#o-n').value.trim(),phone:$('#o-p').value.trim(),address:$('#o-a').value.trim(),track:$('#o-t').value.trim(),note:$('#o-m').value.trim()};api('PUT','/api/admin/orders/'+id,pt).then(function(){Object.assign(oo,pt);eo=0;render()}).catch(function(x){alert(x.message)});return}}
if(a==='sp2'){var pp={about:$('#g-a').value,terms:$('#g-t').value,faq:$('#g-f').value};api('PUT','/api/admin/pages',pp).then(function(){S.pages=pp;alert('ذخیره شد.')}).catch(function(x){alert(x.message)});return}
if(a==='bk'){api('POST','/api/admin/backup',{}).then(function(r){alert('بکاپ در سرور ساخته شد: '+r.name)}).catch(function(x){alert(x.message)});return}
if(a==='ex'){fetch('/api/admin/export',{credentials:'same-origin'}).then(function(r){if(!r.ok)throw new Error('فقط مدیر می‌تواند بکاپ بگیرد.');return r.blob()}).then(function(b){var l=document.createElement('a');l.href=URL.createObjectURL(b);l.download='banuye-khas-backup.json';document.body.appendChild(l);l.click();l.remove()}).catch(function(x){alert(x.message)});return}
if(a==='ac'){var v=$('#nc').value.trim();if(v&&S.cats.indexOf(v)<0){S.cats.push(v);save()}}
if(a==='dc'&&confirm('این دسته حذف شود؟ محصولات آن حذف نمی‌شوند.')){S.cats.splice(+id,1);save()}
if(a==='pw'){var w=$('#npw').value,w2=$('#np2').value;if((w&&w.length<6)||(w2&&w2.length<6)){alert('هر رمز باید حداقل ۶ نویسه باشد.')}else{api('POST','/api/admin/passwords',{owner:w,staff:w2}).then(function(){alert('ذخیره شد.')}).catch(function(x){alert(x.message)})}}
if(a==='ss'){S.settings={tg:$('#s-tg').value.trim(),ig:$('#s-ig').value.trim(),rb:$('#s-rb').value.trim(),phone:$('#s-ph').value.trim()};save();alert('ذخیره شد.')}
if(a==='rf'){loadAdmin();return}
render()});
})();
