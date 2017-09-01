# Host: localhost  (Version 5.7.16)
# Date: 2017-08-25 17:41:36
# Generator: MySQL-Front 6.0  (Build 2.20)


#
# Structure for table "t_academy"
#

DROP TABLE IF EXISTS `t_academy`;
CREATE TABLE `t_academy` (
  `Academy_id` varchar(10) NOT NULL,
  `Academy_name` varchar(30) NOT NULL,
  PRIMARY KEY (`Academy_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

#
# Data for table "t_academy"
#


#
# Structure for table "t_admin"
#

DROP TABLE IF EXISTS `t_admin`;
CREATE TABLE `t_admin` (
  `Admin_id` int(11) NOT NULL AUTO_INCREMENT,
  `Admin_name` varchar(10) NOT NULL,
  `Admin_password` varchar(32) NOT NULL,
  PRIMARY KEY (`Admin_id`),
  UNIQUE KEY `Admin_id_UNIQUE` (`Admin_id`),
  UNIQUE KEY `Admin_name` (`Admin_name`)
) ENGINE=InnoDB AUTO_INCREMENT=19 DEFAULT CHARSET=utf8;

#
# Data for table "t_admin"
#

INSERT INTO `t_admin` VALUES (8,'hwf','c03223e4c2e74fdac0e5f7469073da26'),(9,'zsy','eb25d21e8a4d7dc52947b61ab26a2694'),(10,'admin','21232f297a57a5a743894a0e4a801fc3'),(11,'test','098f6bcd4621d373cade4e832627b4f6'),(12,'test2','ad0234829205b9033196ba818f7a872b'),(13,'test3','8ad8757baa8564dc136c1e07507f4a98'),(14,'test5','e3d704f3542b44a621ebed70dc0efe13'),(15,'test6','b04083e53e242626595e2b8ea327e525'),(16,'oo','e47ca7a09cf6781e29634502345930a7'),(17,'asd','7815696ecbf1c96e6894b779456d330e'),(18,'1','c4ca4238a0b923820dcc509a6f75849b');

#
# Structure for table "t_book_student"
#

DROP TABLE IF EXISTS `t_book_student`;
CREATE TABLE `t_book_student` (
  `Id` varchar(35) NOT NULL,
  `Book_num` varchar(15) NOT NULL,
  `Student_num` varchar(15) NOT NULL,
  `borrow_date` date NOT NULL,
  `return_date` date NOT NULL,
  `Money` decimal(5,2) NOT NULL,
  PRIMARY KEY (`Id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

#
# Data for table "t_book_student"
#


#
# Structure for table "t_class"
#

DROP TABLE IF EXISTS `t_class`;
CREATE TABLE `t_class` (
  `Class_id` varchar(10) NOT NULL,
  `Class_name` varchar(30) NOT NULL,
  `Academy_id` varchar(10) NOT NULL,
  PRIMARY KEY (`Class_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

#
# Data for table "t_class"
#


#
# Structure for table "t_spend"
#

DROP TABLE IF EXISTS `t_spend`;
CREATE TABLE `t_spend` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `purchaser` varchar(100) NOT NULL DEFAULT '' COMMENT '购买者',
  `Sort_id` int(11) NOT NULL,
  `Price` decimal(5,2) DEFAULT NULL COMMENT '价格',
  `purchaserPlace` varchar(20) DEFAULT NULL COMMENT '地点',
  `purchaserDate` date DEFAULT '0000-00-00' COMMENT '时间',
  `Current_num` int(11) NOT NULL DEFAULT '0' COMMENT '数量',
  `Brief` text COMMENT '备注',
  `imageName` varchar(100) DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8;

#
# Data for table "t_spend"
#


#
# Structure for table "t_student"
#

DROP TABLE IF EXISTS `t_student`;
CREATE TABLE `t_student` (
  `Student_num` varchar(15) NOT NULL,
  `Student_name` varchar(10) NOT NULL,
  `Password` varchar(20) NOT NULL,
  `Academy_id` varchar(10) NOT NULL,
  `Class_id` varchar(10) NOT NULL,
  `Sex` varchar(2) DEFAULT NULL,
  `Telephone` varchar(15) DEFAULT NULL,
  `Email` varchar(20) DEFAULT NULL,
  `Lended_num` int(11) NOT NULL DEFAULT '0',
  `Create_date` date NOT NULL,
  PRIMARY KEY (`Student_num`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

#
# Data for table "t_student"
#


#
# Structure for table "t_type"
#

DROP TABLE IF EXISTS `t_type`;
CREATE TABLE `t_type` (
  `Sort_id` int(11) NOT NULL AUTO_INCREMENT,
  `Sort_name` varchar(20) NOT NULL,
  PRIMARY KEY (`Sort_id`)
) ENGINE=InnoDB AUTO_INCREMENT=18 DEFAULT CHARSET=utf8;

#
# Data for table "t_type"
#

INSERT INTO `t_type` VALUES (1,'饮食'),(2,'服装'),(4,'水电'),(5,'交通'),(6,'通讯'),(7,'医疗'),(8,'租房'),(9,'旅游'),(10,'购物'),(13,'C#'),(14,'angular'),(15,'游戏'),(16,'test2');
