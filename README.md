# DailyManageWith_avalon
使用avalon替换angular重写前面日常消费管理系统，后台接口及数据库不变动。

### 系统说明
* 前端使用语言：avalonjs,css,html。
* 后端使用语言：nodejs。
* 数据库：MySQL。
* 框架：
    * 前端框架和组件：avalon.oniui-master组件库(主要使用mmRouter,simplegrid,ajax),bootstrap。
    * 后端框架：nodejs的express。
    * 打包工具：requirejs。
### 结构
```
app
├──controller	后台的controller部分
	├──AdminCtrl.js 后台页面管理的controller部分
	├──UserCtrl.js	登录的controller部分
	├──config.js 刚开始是为了表单解决跨域的问题，后面写成一个服务器就用不上了
├──dao	数据处理层，实现对对应model的增删查改等等
	├──SpendDao.js 数据库接口
	├──SpendTypeDao.js 数据库接口
	├──UserDao.js 数据库接口
├──db	封装的数据库连接池部分
	├──connection.js 数据库连接池封装
	├──DBconfig.js MySQL数据库配置
├──lib	项目引用的库
	├──avalon.oniui-master avalon组件文件
	├──bootstrap-3.3.6 bootstrap样式
	├──bootstrap-select-1.9.3 用到了select下拉框的动态加载，所以另外引用了样式文件
	├──fetch-polyfill2 不支持ie8，后改为组件里面的avalon.ajax
	├──jquery-1.9.1.js jquery
	├──echarts
	├──html5shiv.min.js
	├──respond.min.js
├──model
	├──Model.js	Java的理解是实体类，不过项目很多都是直接传对象的，没用到，不过数据定义在这个文件，方便理解和查看
├──static 静态文件，包含JS和CSS文件，可以用Grunt或者Gulp压缩混淆
	├──scripts
		├──admin.js 后台管理模块的controller部分，打包前的原始文件，打包需要放在lib下的avalon.oniui-master目录下，和组件一起打包
		├──adminbuild.js 后台管理打包文件，用r.js打包后的主文件
		├──adminconfig.js 打包配置文件，打包需要放在lib下的avalon.oniui-master目录下，和组件一起打包
		├──avalonRouter.js 路由配置，合并后不使用
		├──avalonVm.js 路由配置，合并后不使用
		├──index.js 登录页面打包文件
		├──indexconfig.js 登陆模块的打包文件配置
		├──login.js 登陆模块的js，打包前原始文件
		├──r.js requirejs打包必备文件
	├──styles 样式文件
├──test 后台接口测试部分，对DAO进行接口测试
├──views 项目的模板，或者说叫视图部分
├──app.js 服务器启动文件
├──routes.js 后台路由配置文件
```
_______________________________________________________________
### 使用
1. 载入mysql文件
2. 进入app目录，npm install
3. node app.js运行
4. 打开localhost:9003

###### 建议使用webstorm搭建环境
