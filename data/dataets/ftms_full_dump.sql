CREATE DATABASE  IF NOT EXISTS `financial_tracking_system` /*!40100 DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci */ /*!80016 DEFAULT ENCRYPTION='N' */;
USE `financial_tracking_system`;
-- MySQL dump 10.13  Distrib 8.0.45, for Win64 (x86_64)
--
-- Host: 127.0.0.1    Database: financial_tracking_system
-- ------------------------------------------------------
-- Server version	8.0.45

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!50503 SET NAMES utf8 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Table structure for table `companies`
--

DROP TABLE IF EXISTS `companies`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `companies` (
  `company_id` int NOT NULL AUTO_INCREMENT,
  `company_name` varchar(150) NOT NULL,
  `company_code` varchar(20) NOT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`company_id`),
  UNIQUE KEY `company_code` (`company_code`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `companies`
--

LOCK TABLES `companies` WRITE;
/*!40000 ALTER TABLE `companies` DISABLE KEYS */;
INSERT INTO `companies` VALUES (1,'EML Transportation Inc.','EML','2026-04-05 12:44:26');
/*!40000 ALTER TABLE `companies` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `salary_records`
--

DROP TABLE IF EXISTS `salary_records`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `salary_records` (
  `salary_id` int NOT NULL AUTO_INCREMENT,
  `staff_id` int NOT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `period_start` date NOT NULL,
  `period_end` date NOT NULL,
  `base_salary` decimal(10,2) DEFAULT '0.00',
  `shipment_bonus` decimal(10,2) NOT NULL DEFAULT '0.00',
  `bonus` decimal(10,2) DEFAULT '0.00',
  `tax_percent` decimal(5,2) NOT NULL DEFAULT '0.00',
  `total_salary` decimal(10,2) NOT NULL DEFAULT '0.00',
  PRIMARY KEY (`salary_id`),
  KEY `idx_salary_records_staff_id` (`staff_id`),
  KEY `idx_salary_records_period_start` (`period_start`),
  KEY `idx_salary_records_period_end` (`period_end`),
  CONSTRAINT `fk_salary_records_staff` FOREIGN KEY (`staff_id`) REFERENCES `staff` (`staff_id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `salary_records`
--

LOCK TABLES `salary_records` WRITE;
/*!40000 ALTER TABLE `salary_records` DISABLE KEYS */;
INSERT INTO `salary_records` VALUES (1,2,'2026-04-07 12:27:39','2026-04-03','2026-04-06',300.00,366.00,250.00,7.50,847.30),(2,3,'2026-04-08 13:58:35','2026-04-03','2026-04-06',200.00,145.00,100.00,7.50,411.62),(3,4,'2026-04-08 14:00:54','2026-04-03','2026-04-06',200.00,99.00,100.00,7.50,369.07),(4,2,'2026-04-11 21:27:33','2026-04-02','2026-04-16',200.00,366.00,50.00,0.70,611.69);
/*!40000 ALTER TABLE `salary_records` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `shipment_logs`
--

DROP TABLE IF EXISTS `shipment_logs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `shipment_logs` (
  `shipment_log_id` int NOT NULL AUTO_INCREMENT,
  `shipment_id` int NOT NULL,
  `staff_id` int NOT NULL,
  `field_name` varchar(100) DEFAULT NULL,
  `old_value` text,
  `new_value` text,
  `note` text,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`shipment_log_id`),
  KEY `idx_shipment_logs_shipment_id` (`shipment_id`),
  KEY `idx_shipment_logs_staff_id` (`staff_id`),
  KEY `idx_shipment_logs_updated_at` (`updated_at`),
  CONSTRAINT `fk_shipment_logs_shipment` FOREIGN KEY (`shipment_id`) REFERENCES `shipments` (`shipment_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_shipment_logs_staff` FOREIGN KEY (`staff_id`) REFERENCES `staff` (`staff_id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=135 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `shipment_logs`
--

LOCK TABLES `shipment_logs` WRITE;
/*!40000 ALTER TABLE `shipment_logs` DISABLE KEYS */;
INSERT INTO `shipment_logs` VALUES (1,1,1,'shipment_created',NULL,'EML0420260001','Shipment created with reference number EML0420260001','2026-04-05 13:36:32'),(2,2,1,'shipment_created',NULL,'EML0420260002','Shipment created with reference number EML0420260002','2026-04-05 13:37:23'),(3,3,1,'shipment_created',NULL,'EML0420260003','Shipment created with reference number EML0420260003','2026-04-05 13:37:32'),(4,4,1,'shipment_created',NULL,'EML0420260004','Shipment created with reference number EML0420260004','2026-04-05 13:38:02'),(5,5,1,'shipment_created',NULL,'EML0420260005','Shipment created with reference number EML0420260005','2026-04-05 13:38:10'),(6,6,1,'shipment_created',NULL,'EML0420260006','Shipment created with reference number EML0420260006','2026-04-05 13:38:18'),(7,7,1,'shipment_created',NULL,'EML0420260007','Shipment created with reference number EML0420260007','2026-04-05 13:38:23'),(8,8,1,'shipment_created',NULL,'EML0420260008','Shipment created with reference number EML0420260008','2026-04-05 13:38:30'),(9,9,1,'shipment_created',NULL,'EML0420260009','Shipment created with reference number EML0420260009','2026-04-05 13:38:35'),(10,10,1,'shipment_created',NULL,'EML0420260010','Shipment created with reference number EML0420260010','2026-04-05 13:38:40'),(11,1,2,'miles','0.00','185.0','miles updated','2026-04-05 13:49:40'),(12,1,2,'broker_price','2400.00','2400.0','broker_price updated','2026-04-05 13:49:40'),(13,1,2,'driver_pay','1800.00','1800.0','driver_pay updated','2026-04-05 13:49:40'),(14,1,2,'profit','600.00','600.0','profit updated','2026-04-05 13:49:40'),(15,1,2,'percentage_of_margin','25.00','25.0','percentage_of_margin updated','2026-04-05 13:49:40'),(16,1,2,'loads_per_day','0','1','loads_per_day updated','2026-04-05 13:49:40'),(17,1,2,'dispatcher_commission_percent','0.00','9.0','dispatcher_commission_percent updated','2026-04-05 13:49:40'),(18,2,2,'miles','0.00','240.0','miles updated','2026-04-05 13:49:57'),(19,2,2,'broker_price','1900.00','1900.0','broker_price updated','2026-04-05 13:49:57'),(20,2,2,'driver_pay','1400.00','1400.0','driver_pay updated','2026-04-05 13:49:57'),(21,2,2,'profit','500.00','500.0','profit updated','2026-04-05 13:49:57'),(22,2,2,'loads_per_day','0','1','loads_per_day updated','2026-04-05 13:49:57'),(23,2,2,'dispatcher_commission_percent','0.00','10.0','dispatcher_commission_percent updated','2026-04-05 13:49:57'),(24,4,2,'miles','0.00','212.0','miles updated','2026-04-05 13:50:20'),(25,4,2,'broker_price','1700.00','1700.0','broker_price updated','2026-04-05 13:50:20'),(26,4,2,'driver_pay','1250.00','1250.0','driver_pay updated','2026-04-05 13:50:20'),(27,4,2,'profit','450.00','450.0','profit updated','2026-04-05 13:50:20'),(28,4,2,'loads_per_day','0','2','loads_per_day updated','2026-04-05 13:50:20'),(29,4,2,'dispatcher_commission_percent','0.00','9.0','dispatcher_commission_percent updated','2026-04-05 13:50:20'),(30,5,2,'miles','0.00','300.0','miles updated','2026-04-05 13:50:37'),(31,5,2,'broker_price','2100.00','2100.0','broker_price updated','2026-04-05 13:50:37'),(32,5,2,'driver_pay','1550.00','1550.0','driver_pay updated','2026-04-05 13:50:37'),(33,5,2,'profit','550.00','550.0','profit updated','2026-04-05 13:50:37'),(34,5,2,'loads_per_day','0','2','loads_per_day updated','2026-04-05 13:50:37'),(35,5,2,'dispatcher_commission_percent','0.00','10.0','dispatcher_commission_percent updated','2026-04-05 13:50:37'),(36,6,2,'unit_number','TRK-106','TRK-105','unit_number updated','2026-04-05 13:50:48'),(37,6,2,'assigned_staff_id','4','3','assigned_staff_id updated','2026-04-05 13:50:48'),(38,6,2,'driver_name','Michael Brown','Jason Cole','driver_name updated','2026-04-05 13:50:48'),(39,6,2,'business_name','NorthStar Cargo','BlueLine Transport','business_name updated','2026-04-05 13:50:48'),(40,6,2,'broker_name','TQL','Uber Freight','broker_name updated','2026-04-05 13:50:48'),(41,6,2,'pickup_city','Columbus','Phoenix','pickup_city updated','2026-04-05 13:50:48'),(42,6,2,'pickup_state','OH','AZ','pickup_state updated','2026-04-05 13:50:48'),(43,6,2,'pickup_datetime','2026-04-05 14:00:00','2026-04-05 13:00:00','pickup_datetime updated','2026-04-05 13:50:48'),(44,6,2,'delivery_city','Cleveland','Las Vegas','delivery_city updated','2026-04-05 13:50:48'),(45,6,2,'delivery_state','OH','NV','delivery_state updated','2026-04-05 13:50:48'),(46,6,2,'delivery_datetime','2026-04-05 18:30:00','2026-04-05 19:30:00','delivery_datetime updated','2026-04-05 13:50:48'),(47,6,2,'miles','0.00','300.0','miles updated','2026-04-05 13:50:48'),(48,6,2,'broker_price','1500.00','2100.0','broker_price updated','2026-04-05 13:50:48'),(49,6,2,'driver_pay','1100.00','1550.0','driver_pay updated','2026-04-05 13:50:48'),(50,6,2,'profit','400.00','550.0','profit updated','2026-04-05 13:50:48'),(51,6,2,'percentage_of_margin','26.67','26.19','percentage_of_margin updated','2026-04-05 13:50:48'),(52,6,2,'loads_per_day','0','2','loads_per_day updated','2026-04-05 13:50:48'),(53,6,2,'dispatcher_commission_percent','0.00','10.0','dispatcher_commission_percent updated','2026-04-05 13:50:48'),(54,6,2,'shipment_status','delivered','in_transit','shipment_status updated','2026-04-05 13:50:48'),(55,6,2,'payment_status','paid','unpaid','payment_status updated','2026-04-05 13:50:48'),(56,6,2,'payment_option','standard','quick_pay','payment_option updated','2026-04-05 13:50:48'),(57,6,2,'comments','Completed successfully','Desert route','comments updated','2026-04-05 13:50:48'),(58,5,2,'miles','300.00','300.0','miles updated','2026-04-05 13:51:14'),(59,5,2,'broker_price','2100.00','2100.0','broker_price updated','2026-04-05 13:51:14'),(60,5,2,'driver_pay','1550.00','1550.0','driver_pay updated','2026-04-05 13:51:14'),(61,5,2,'profit','550.00','550.0','profit updated','2026-04-05 13:51:14'),(62,5,2,'dispatcher_commission_percent','10.00','10.0','dispatcher_commission_percent updated','2026-04-05 13:51:14'),(63,6,2,'unit_number','TRK-105','TRK-106','unit_number updated','2026-04-05 13:51:21'),(64,6,2,'assigned_staff_id','3','4','assigned_staff_id updated','2026-04-05 13:51:21'),(65,6,2,'driver_name','Jason Cole','Michael Brown','driver_name updated','2026-04-05 13:51:21'),(66,6,2,'business_name','BlueLine Transport','NorthStar Cargo','business_name updated','2026-04-05 13:51:21'),(67,6,2,'broker_name','Uber Freight','TQL','broker_name updated','2026-04-05 13:51:21'),(68,6,2,'pickup_city','Phoenix','Columbus','pickup_city updated','2026-04-05 13:51:21'),(69,6,2,'pickup_state','AZ','OH','pickup_state updated','2026-04-05 13:51:21'),(70,6,2,'pickup_datetime','2026-04-05 13:00:00','2026-04-05 14:00:00','pickup_datetime updated','2026-04-05 13:51:21'),(71,6,2,'delivery_city','Las Vegas','Cleveland','delivery_city updated','2026-04-05 13:51:21'),(72,6,2,'delivery_state','NV','OH','delivery_state updated','2026-04-05 13:51:21'),(73,6,2,'delivery_datetime','2026-04-05 19:30:00','2026-04-05 18:30:00','delivery_datetime updated','2026-04-05 13:51:21'),(74,6,2,'miles','300.00','145.0','miles updated','2026-04-05 13:51:21'),(75,6,2,'broker_price','2100.00','1500.0','broker_price updated','2026-04-05 13:51:21'),(76,6,2,'driver_pay','1550.00','1100.0','driver_pay updated','2026-04-05 13:51:21'),(77,6,2,'profit','550.00','400.0','profit updated','2026-04-05 13:51:21'),(78,6,2,'percentage_of_margin','26.19','26.67','percentage_of_margin updated','2026-04-05 13:51:21'),(79,6,2,'dispatcher_commission_percent','10.00','11.0','dispatcher_commission_percent updated','2026-04-05 13:51:21'),(80,6,2,'shipment_status','in_transit','delivered','shipment_status updated','2026-04-05 13:51:21'),(81,6,2,'payment_status','unpaid','paid','payment_status updated','2026-04-05 13:51:21'),(82,6,2,'payment_option','quick_pay','standard','payment_option updated','2026-04-05 13:51:21'),(83,6,2,'comments','Desert route','Completed successfully','comments updated','2026-04-05 13:51:21'),(84,7,2,'miles','0.00','520.0','miles updated','2026-04-05 13:51:28'),(85,7,2,'broker_price','2800.00','2800.0','broker_price updated','2026-04-05 13:51:28'),(86,7,2,'driver_pay','2100.00','2100.0','driver_pay updated','2026-04-05 13:51:28'),(87,7,2,'profit','700.00','700.0','profit updated','2026-04-05 13:51:29'),(88,7,2,'percentage_of_margin','25.00','25.0','percentage_of_margin updated','2026-04-05 13:51:29'),(89,7,2,'loads_per_day','0','3','loads_per_day updated','2026-04-05 13:51:29'),(90,7,2,'dispatcher_commission_percent','0.00','9.0','dispatcher_commission_percent updated','2026-04-05 13:51:29'),(91,8,2,'miles','0.00','250.0','miles updated','2026-04-05 13:51:36'),(92,8,2,'broker_price','1600.00','1600.0','broker_price updated','2026-04-05 13:51:36'),(93,8,2,'driver_pay','1200.00','1200.0','driver_pay updated','2026-04-05 13:51:36'),(94,8,2,'profit','400.00','400.0','profit updated','2026-04-05 13:51:36'),(95,8,2,'percentage_of_margin','25.00','25.0','percentage_of_margin updated','2026-04-05 13:51:36'),(96,8,2,'loads_per_day','0','3','loads_per_day updated','2026-04-05 13:51:36'),(97,8,2,'dispatcher_commission_percent','0.00','10.0','dispatcher_commission_percent updated','2026-04-05 13:51:36'),(98,9,2,'miles','0.00','280.0','miles updated','2026-04-05 13:51:43'),(99,9,2,'broker_price','2000.00','2000.0','broker_price updated','2026-04-05 13:51:43'),(100,9,2,'driver_pay','1500.00','1500.0','driver_pay updated','2026-04-05 13:51:43'),(101,9,2,'profit','500.00','500.0','profit updated','2026-04-05 13:51:43'),(102,9,2,'percentage_of_margin','25.00','25.0','percentage_of_margin updated','2026-04-05 13:51:43'),(103,9,2,'loads_per_day','0','3','loads_per_day updated','2026-04-05 13:51:43'),(104,9,2,'dispatcher_commission_percent','0.00','11.0','dispatcher_commission_percent updated','2026-04-05 13:51:43'),(105,10,2,'miles','0.00','175.0','miles updated','2026-04-05 13:51:54'),(106,10,2,'broker_price','2300.00','2300.0','broker_price updated','2026-04-05 13:51:54'),(107,10,2,'driver_pay','1750.00','1750.0','driver_pay updated','2026-04-05 13:51:54'),(108,10,2,'profit','550.00','550.0','profit updated','2026-04-05 13:51:54'),(109,10,2,'loads_per_day','0','4','loads_per_day updated','2026-04-05 13:51:54'),(110,10,2,'dispatcher_commission_percent','0.00','9.0','dispatcher_commission_percent updated','2026-04-05 13:51:54'),(111,3,2,'miles','0.00','440.0','miles updated','2026-04-05 13:52:30'),(112,3,2,'broker_price','2600.00','2600.0','broker_price updated','2026-04-05 13:52:30'),(113,3,2,'driver_pay','2000.00','2000.0','driver_pay updated','2026-04-05 13:52:30'),(114,3,2,'profit','600.00','600.0','profit updated','2026-04-05 13:52:30'),(115,3,2,'loads_per_day','0','1','loads_per_day updated','2026-04-05 13:52:30'),(116,3,2,'dispatcher_commission_percent','0.00','11.0','dispatcher_commission_percent updated','2026-04-05 13:52:30'),(117,1,2,'external_reference',NULL,'BROKER-1001',NULL,'2026-04-05 14:23:29'),(118,1,2,'broker_price','2400.00','3500.0',NULL,'2026-04-05 14:23:44'),(119,1,2,'profit','600.00','1700.0',NULL,'2026-04-05 14:23:44'),(120,1,2,'percentage_of_margin','25.00','48.57',NULL,'2026-04-05 14:23:44'),(121,2,2,'external_reference',NULL,'BROKER-1002',NULL,'2026-04-05 14:25:56'),(122,3,2,'external_reference',NULL,'BROKER-1003',NULL,'2026-04-05 14:26:02'),(123,4,2,'external_reference',NULL,'BROKER-1004',NULL,'2026-04-05 14:26:05'),(124,5,2,'external_reference',NULL,'BROKER-1005',NULL,'2026-04-05 14:26:09'),(125,6,2,'external_reference',NULL,'BROKER-1006',NULL,'2026-04-05 14:26:15'),(126,7,2,'external_reference',NULL,'BROKER-1007',NULL,'2026-04-05 14:26:22'),(127,8,2,'external_reference',NULL,'BROKER-1008',NULL,'2026-04-05 14:26:25'),(128,9,2,'external_reference',NULL,'BROKER-1009',NULL,'2026-04-05 14:26:31'),(129,10,2,'external_reference',NULL,'BROKER-1010',NULL,'2026-04-05 14:26:36'),(130,3,2,NULL,NULL,NULL,'Shipment soft deleted','2026-04-05 14:27:09'),(131,11,2,NULL,NULL,NULL,'Shipment created','2026-04-05 14:29:10'),(132,1,2,'miles','185.00','195.0',NULL,'2026-04-07 11:01:58'),(133,5,2,'shipment_status','in_transit','picked_up',NULL,'2026-04-11 16:39:16'),(134,9,2,'shipment_status','picked_up','in_transit',NULL,'2026-04-11 16:54:43');
/*!40000 ALTER TABLE `shipment_logs` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `shipments`
--

DROP TABLE IF EXISTS `shipments`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `shipments` (
  `shipment_id` int NOT NULL AUTO_INCREMENT,
  `company_id` int NOT NULL,
  `company_reference` varchar(50) NOT NULL,
  `external_reference` varchar(100) DEFAULT NULL,
  `unit_number` varchar(50) DEFAULT NULL,
  `assigned_staff_id` int NOT NULL,
  `staff_full_name` varchar(100) DEFAULT NULL,
  `shipment_created_date` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `driver_name` varchar(100) DEFAULT NULL,
  `business_name` varchar(150) DEFAULT NULL,
  `broker_name` varchar(150) DEFAULT NULL,
  `pickup_city` varchar(100) DEFAULT NULL,
  `pickup_state` varchar(50) DEFAULT NULL,
  `pickup_datetime` datetime DEFAULT NULL,
  `delivery_city` varchar(100) DEFAULT NULL,
  `delivery_state` varchar(50) DEFAULT NULL,
  `delivery_datetime` datetime DEFAULT NULL,
  `miles` decimal(10,2) DEFAULT '0.00',
  `broker_price` decimal(10,2) DEFAULT '0.00',
  `driver_pay` decimal(10,2) DEFAULT '0.00',
  `profit` decimal(10,2) DEFAULT '0.00',
  `percentage_of_margin` decimal(5,2) DEFAULT '0.00',
  `loads_per_day` int DEFAULT '0',
  `dispatcher_commission_percent` decimal(5,2) DEFAULT '0.00',
  `shipment_status` varchar(50) NOT NULL DEFAULT 'created',
  `payment_status` varchar(50) NOT NULL DEFAULT 'unpaid',
  `payment_option` varchar(50) DEFAULT NULL,
  `comments` text,
  `is_deleted` tinyint(1) NOT NULL DEFAULT '0',
  `deleted_at` datetime DEFAULT NULL,
  `deleted_by` int DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`shipment_id`),
  UNIQUE KEY `reference_number` (`company_reference`),
  KEY `idx_shipments_company_id` (`company_id`),
  KEY `idx_shipments_assigned_staff_id` (`assigned_staff_id`),
  KEY `idx_shipments_reference_number` (`company_reference`),
  KEY `idx_shipments_status` (`shipment_status`),
  KEY `idx_shipments_payment_status` (`payment_status`),
  KEY `idx_shipments_is_deleted` (`is_deleted`),
  KEY `fk_shipments_deleted_by` (`deleted_by`),
  CONSTRAINT `fk_shipments_company` FOREIGN KEY (`company_id`) REFERENCES `companies` (`company_id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `fk_shipments_deleted_by` FOREIGN KEY (`deleted_by`) REFERENCES `staff` (`staff_id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_shipments_staff` FOREIGN KEY (`assigned_staff_id`) REFERENCES `staff` (`staff_id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=12 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `shipments`
--

LOCK TABLES `shipments` WRITE;
/*!40000 ALTER TABLE `shipments` DISABLE KEYS */;
INSERT INTO `shipments` VALUES (1,1,'EML0420260001','BROKER-1001','TRK-101',2,'Alex Crowley','2026-04-05 13:36:32','Robert Miles','Prime Haul LLC','Landstar','Chicago','IL','2026-04-05 09:00:00','Indianapolis','IN','2026-04-05 17:30:00',195.00,3500.00,1800.00,1700.00,48.57,1,9.00,'created','unpaid','standard','Test shipment',0,NULL,NULL,'2026-04-05 13:36:32'),(2,1,'EML0420260002','BROKER-1002','TRK-102',3,'Michael Turner','2026-04-05 13:37:23','Kevin Hall','Falcon Freight','CH Robinson','Dallas','TX','2026-04-05 10:00:00','Houston','TX','2026-04-05 16:30:00',240.00,1900.00,1400.00,500.00,26.32,1,10.00,'created','unpaid','quick_pay','Short route load',0,NULL,NULL,'2026-04-05 13:37:23'),(3,1,'EML0420260003','BROKER-1003','TRK-103',4,'Daniel Reyes','2026-04-05 13:37:32','Marcus Reed','Titan Cargo','TQL','Atlanta','GA','2026-04-05 11:00:00','Orlando','FL','2026-04-05 20:00:00',440.00,2600.00,2000.00,600.00,23.08,1,11.00,'created','unpaid','standard','Long distance load',1,'2026-04-05 14:27:09',2,'2026-04-05 13:37:32'),(4,1,'EML0420260004','BROKER-1004','TRK-104',2,'Alex Crowley','2026-04-05 13:38:02','Adam Scott','Horizon Express','Coyote Logistics','Nashville','TN','2026-04-05 12:00:00','Memphis','TN','2026-04-05 18:00:00',212.00,1700.00,1250.00,450.00,26.47,2,9.00,'picked_up','unpaid','standard','Same day delivery',0,NULL,NULL,'2026-04-05 13:38:02'),(5,1,'EML0420260005','BROKER-1005','TRK-105',3,'Michael Turner','2026-04-05 13:38:10','Jason Cole','BlueLine Transport','Uber Freight','Phoenix','AZ','2026-04-05 13:00:00','Las Vegas','NV','2026-04-05 19:30:00',300.00,2100.00,1550.00,550.00,26.19,2,10.00,'picked_up','unpaid','quick_pay','Desert route',0,NULL,NULL,'2026-04-05 13:38:10'),(6,1,'EML0420260006','BROKER-1006','TRK-106',4,'Daniel Reyes','2026-04-05 13:38:18','Michael Brown','NorthStar Cargo','TQL','Columbus','OH','2026-04-05 14:00:00','Cleveland','OH','2026-04-05 18:30:00',145.00,1500.00,1100.00,400.00,26.67,2,11.00,'delivered','paid','standard','Completed successfully',0,NULL,NULL,'2026-04-05 13:38:18'),(7,1,'EML0420260007','BROKER-1007','TRK-107',2,'Alex Crowley','2026-04-05 13:38:23','Chris Evans','Skyline Freight','CH Robinson','Denver','CO','2026-04-05 15:00:00','Salt Lake City','UT','2026-04-05 23:00:00',520.00,2800.00,2100.00,700.00,25.00,3,9.00,'in_transit','unpaid','standard','Mountain route',0,NULL,NULL,'2026-04-05 13:38:23'),(8,1,'EML0420260008','BROKER-1008','TRK-108',3,'Michael Turner','2026-04-05 13:38:30','Brian Adams','Rapid Haul','Landstar','Kansas City','MO','2026-04-05 16:00:00','St Louis','MO','2026-04-05 20:00:00',250.00,1600.00,1200.00,400.00,25.00,3,10.00,'delivered','paid','qp_driver','Short run',0,NULL,NULL,'2026-04-05 13:38:30'),(9,1,'EML0420260009','BROKER-1009','TRK-109',4,'Daniel Reyes','2026-04-05 13:38:35','Daniel White','Elite Transport','Coyote Logistics','Miami','FL','2026-04-05 17:00:00','Tampa','FL','2026-04-05 22:30:00',280.00,2000.00,1500.00,500.00,25.00,3,11.00,'in_transit','unpaid','standard','Florida route',0,NULL,NULL,'2026-04-05 13:38:35'),(10,1,'EML0420260010','BROKER-1010','TRK-110',2,'Alex Crowley','2026-04-05 13:38:40','Andrew King','Atlas Logistics','Uber Freight','Seattle','WA','2026-04-05 18:00:00','Portland','OR','2026-04-05 23:30:00',175.00,2300.00,1750.00,550.00,23.91,4,9.00,'created','unpaid','do_not_factor','West coast load',0,NULL,NULL,'2026-04-05 13:38:40'),(11,1,'EML0420260011','BROKER-1011','TR-1001',2,'Alex Crowley','2026-04-05 14:29:10','John Smith','Prime Logistics','TQL','Chicago','IL','2026-04-05 10:00:00','Dallas','TX','2026-04-06 18:00:00',925.00,3500.00,2300.00,1200.00,34.29,1,5.00,'created','unpaid','standard','Test shipment',0,NULL,NULL,'2026-04-05 14:29:10');
/*!40000 ALTER TABLE `shipments` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `staff`
--

DROP TABLE IF EXISTS `staff`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `staff` (
  `staff_id` int NOT NULL AUTO_INCREMENT,
  `staff_username` varchar(50) NOT NULL,
  `password_hash` varchar(255) NOT NULL,
  `staff_full_name` varchar(100) NOT NULL,
  `job_title` varchar(50) NOT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`staff_id`),
  UNIQUE KEY `staff_username` (`staff_username`)
) ENGINE=InnoDB AUTO_INCREMENT=10 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `staff`
--

LOCK TABLES `staff` WRITE;
/*!40000 ALTER TABLE `staff` DISABLE KEYS */;
INSERT INTO `staff` VALUES (1,'admin','$2b$12$EPdZAqO30OSLuTtOVRm.2uLYcUp4djq97OuB9SahEBZmhEQzN6VIa','Admin Admin','manager',1,'2026-04-05 03:06:06'),(2,'alex.crowley','$2b$12$32SXUJJUBJ7hyz/6kv5RbuhmB8B15h/ZR8/TM8cImCtxN9JWUnBkq','Alex Crowley','manager',1,'2026-04-05 13:23:40'),(3,'michael.turner','$2b$12$6XrbMFO2MMOuEE5E9uE/Q.ILpjD/X5IbEjcaI4LD.WqTFuvNPwimK','Michael Turner','dispatcher',1,'2026-04-05 13:24:17'),(4,'daniel.reyes','$2b$12$BOtVuHVZju9m6El6S526S..rSUSieCotn4nfxJ.zM89ED4xsnJyp6','Daniel Reyes','dispatcher',1,'2026-04-05 13:24:48'),(5,'ethan.parker','$2b$12$NmeHsLy4IdczGIXMl9jC0urFHSvpPJ39N1eYtoi1FKlzdFzOW/PFO','Ethan Parker','dispatcher',1,'2026-04-05 13:25:11'),(6,'amanda.clark','$2b$12$e6/nhviZusOSE9T0gzGzT.Nc8dRVD0MSmkgNsx7xrawGrrpAmLO/2','Amanda Clark','hr',1,'2026-04-05 13:25:45'),(7,'olivia.bennett','$2b$12$Mv5zgLoIS75xysExSu1BxurCUB8LgV5hwhNESk0fen.52YxfJta6S','Olivia Bennett','accounting',1,'2026-04-05 13:26:17'),(8,'james.walker','$2b$12$h0Y/k5jaNcDEXnBRrEyHbOhTQgFpv4nfyviOXHHepP6e25hsot8t.','James Walker','supervisor',1,'2026-04-05 13:26:38'),(9,'noah.brooks','$2b$12$wRC7QnW3u088q3IpPD6t9OLbIxCAAoWr7K3iZTVIruMDg/rcaIqGC','Noah Brooks','tracking',1,'2026-04-05 13:27:14');
/*!40000 ALTER TABLE `staff` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `user_logs`
--

DROP TABLE IF EXISTS `user_logs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `user_logs` (
  `log_id` int NOT NULL AUTO_INCREMENT,
  `staff_id` int NOT NULL,
  `action_type` varchar(100) NOT NULL,
  `changed_by` int DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`log_id`),
  KEY `idx_user_logs_staff_id` (`staff_id`),
  KEY `idx_user_logs_changed_by` (`changed_by`),
  KEY `idx_user_logs_created_at` (`created_at`),
  CONSTRAINT `fk_user_logs_changed_by` FOREIGN KEY (`changed_by`) REFERENCES `staff` (`staff_id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_user_logs_staff` FOREIGN KEY (`staff_id`) REFERENCES `staff` (`staff_id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=12 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `user_logs`
--

LOCK TABLES `user_logs` WRITE;
/*!40000 ALTER TABLE `user_logs` DISABLE KEYS */;
INSERT INTO `user_logs` VALUES (1,2,'user_created',1,'2026-04-05 13:23:40'),(2,3,'user_created',1,'2026-04-05 13:24:17'),(3,4,'user_created',1,'2026-04-05 13:24:48'),(4,5,'user_created',1,'2026-04-05 13:25:11'),(5,6,'user_created',1,'2026-04-05 13:25:45'),(6,7,'user_created',1,'2026-04-05 13:26:17'),(7,8,'user_created',1,'2026-04-05 13:26:38'),(8,9,'user_created',1,'2026-04-05 13:27:14'),(9,7,'password_changed',2,'2026-04-07 11:03:24'),(10,7,'deactivated',2,'2026-04-07 11:03:44'),(11,7,'activated',2,'2026-04-07 11:03:57');
/*!40000 ALTER TABLE `user_logs` ENABLE KEYS */;
UNLOCK TABLES;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2026-04-12 14:28:22
