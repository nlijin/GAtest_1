# EDB Design Document: 
## AADS EDB Complex Data Parsers


# OVERVIEW

The purpose of this component is to setup required components in AADS account for parsing complex data formats like XML, JSON , CSV and Parquet and convert the datasets into a different format requiring only a minimal configuration from the user.
# SCOPE

Unless otherwise stated, all processes described in this document are specific to the Enterprise Data Platform. 

The scope of this document includes

### In-Scope
- Input datasets in either of these formats (XML, JSON , CSV and Parquet)
- Support for Heirarchial and explode outputs for both XML and JSON inputs

### Out of Scope
- Output datasets in either of these formats (JSON, CSV and Parquet). XML is not in scope.
- Input is a folder and the files within the folder do **NOT** have same schema/data format.
- Interactive UI to collect user inputs at different stages of processing is needed , but out of scope for this quarter.
- Non standard XML and JSON input datasets.
- Any processing  not explicitly called out in this document.

# TERMS/ACRONYMS

Term | Definition
------------ | -------------
XML | Extensible markup Language
JSON  | JavaScript Object Notation
CSV | Comma Seperated Value


## **Goals**
This process aims to provide the following core capabilities:

* To automate the dataset conversion from one of the supported formats(XML, JSON, CSV and Parquet) to one of the other supported formats(JSON, CSV and Parquet).
* The dataset conversion would be achieved on basis of Data Owner providing configuration.

The following supporting technical capabilities are also provided

* **Logging:** Generate debug/informational/error messages within the application code and persist them in the appropriate manner for perusal by the operational team. The logs are persisted in cloudwatch logs

* **SNOW Integration:** Creates ServiceNow SNOW ticket if there is a failure due to any issues in the processing due to any user configuration or technical issues

## **Detailed Design**



## DESIGN
### Process Flow and Design

***EDB Complex Data Parsers***

![Flow diagram](flow_diagram.png)

The flow diagram is created using Lucidchart [complex_data_parsers](https://lucid.app/lucidchart/11adec47-0e11-4cf6-949e-fc85488c9330/edit?beaconFlowId=3E1DE693BB004CB3&page=0_0#)

***Process Flow***
Step | Service Component |	Description
---------------------- | ----------------------- | ----------------------- 
1	| UI	| Get required input and call Metadata Extractor
2	| Metadata Extractor	| Using the initial config, read the input file path using a GLUE job and infer the complete list of columns (explode metadata)
3	| UI	| Display the explode metadata to user and ask the user for PK input
4	| Metadata Normaliser	| Using the initial config & PK, generate the hierarchical metadata and display to the user
5	| UI	| "User has option to continue or select a subset of the columns or rename columns from the hierarchical metadata. Also User needs to provide the output type in which mapping would be used to generate the data"
6	| UI	| Once user saves the above step, it generates a mapping JSON file and triggers the parser Glue job.
7	| Hierarchical Parser	| Hierarchical Parser GLUE job to read the initial config and mapping file and generates the hierachical output
8	| Explode Parser	| Explode Parser GLUE job to read the initial config, mapping file and hierarchical output and generates the explode output 
9	|Explode Parser/Hierarchical Parser	| Notify the user of job completion/Failure via email

***EDB Complex Data Parsers design***

The design pattern contains AWS components/services like Glue, Lambda
## Generic Code Overview
### Glue Code

Below are the Glue jobs used in CDP

Function Name |	Description |	Parameters
---------------------- | ----------------------- | -----------------------
edb_metadata_extractor| Generic glue job for metadata extraction of XML,JSON,CSV,Parquet|Inputs config JSON file
cdp_json_hierarchical_converter |Glue script to convert input JSON to CSV and Parquet Hierarchical datasets	 |	
edb_csv_parquet_transformer.py | Glue script to transform parquet/csv to json/parquet/csv based on config and mapping selection | 
cdp_json_explode_converter |Glue script to convert input JSON to CSV and Parquet explode datasets	 |
edb_complex_data_hierarchical_metadata_generator| Glue job for hierarchical metadata extraction of XML,JSON |Input config JSON file with Primary Key


## CONSIDERATIONS/CHALLENGES

• The CDP jobs should read only input files and exclude the cdp-output folder within input path

• When the primary key chosen for explode has duplicates , Cross joins happen resulting in incorrect output

• Composite Primary Key is not currently handled.

• Datasets where no primary key exists or only explode output is needed

• Primary Key column should not have different alias in mapping section i.e. it should be consistent with the alias set in "primary_key" parameter .

• The mapping field in the config file is mandatory field. Meaning, if the user select specific columns and alias the names, only those specific columns and alias will show up in the mapping field, else if the user hasn't selected any columns, then the mapping field will have all the columns populated from the UI. (default - select all columns).

• When generating the metadata extractor for JSON and XML for different schema files (folder-level as the input path), the Glue job will read all the files having the given row-element (for XML) and root-element (for JSON) in config file and filter out the records which doesnt match the row-element/root-element and doesnt fail the job. If the Glue doesnt read any record for corresponding file, a message will be generated in the logs with the list of files that are not read even a single record. This message need to be converted into SQS messaging once Glue job is integrated with the UI. 


## SECURITY PARAMETERS
### IAM Role
 A new IAM Role for complex data parsers ***edb_core_cdp_service_role*** is used to access all the services.

***Creation of S3 access policy***

An IAM policy is created with required permissions to write data into the ***cdp-output*** folder at any level in raw/refined/conformed buckets and attached to the role
***edb_core_cdp_service_role***.

Permissions provided:
        - S3:putObject
        
AWS IAM Policy: ***edb_cdp_write_policy***
  
An IAM policy is created with required permissions to read data from any object in raw/refined/conformed buckets and attached to the role
***edb_core_cdp_service_role***.

Permissions provided:
        - S3:getObject
        
AWS IAM Policy: ***edb_cdp_read_policy***
  
An IAM policy is created with required permissions to read/write/delete data from any object in *** edb-common-data-parser *** folder in code config bucket and attached to the role
***edb_core_cdp_service_role***.

Permissions provided:

        - S3:getObject	
        - S3:putObject	
        - S3:deleteObject
	
AWS IAM Policy: ***edb_cdp_temp_file_policy***

## S3 Folder Design 

***Code Config Bucket - edb_complex_data_parser folder***

This folder contains all the configuration files required for the CDP processing.

```
<code-config-bucket>/
        edb_complex_data_parser/
			<bucket_name>/
                                explode_metadata_config/<dataset_name>.json [Basic Config] -> Extractor Input
				explode_metadata_config/<dataset_name>_metadata.json [Basic Config + Explode Metadata] -> Extractor Output
                
				heirarchical_metadata_config/<dataset_name>.json [Basic Config + Explode Metadata + PK Col List + PK] -> Normaliser Input
				heirarchical_metadata_config/<dataset_name>_metadata.json [Basic Config + Explode Metadata + PK Col List + PK + Hier Metadata] -> Normaliser Output
				
				mapping_metadata_config/<dataset_name_mapping_id>.json [Basic Config + Explode Metadata + PK + Hier Metadata + Mapping Id] -> Mapping Input
				mapping_metadata_config/<dataset_name_mapping_id>_output.json [Basic Config + Explode Metadata + PK + Hier Metadata + Mapping Id + Mapping Output]--> Mapping Output

```
***Raw/Refined/Conformed buckets- cdp-output folder***

The cdp-output folders are created within the same folder the input dataset resides. When the CDP processing is created the cdp-output folders are created and the data is saved under a mapping id folder with multiple folders created within for the different output formats. Subsequent runs should ignore files within the /cdp-output directory

```
<Bucket-raw/refined/conformed>/
		<input_path>/
				source_data_file(s)
				cdp_output/
						<dataset_name>/
								<mapping_id>/
										hierarchical_output/
												csv/
												parquet/
												json/
										explode_output/
												csv/
												parquet/
												json/
```

## Config Files

Each stage of processing requires a configuration file. Samples of the config files required at each job is provided below. 

***Extractor Input - Drugs_Program.json***
```JSON
config: {
    "dataset_name": "Drugs_Program",
    "input_file_type": "json",
    "input_file_path": "s3://lly-edp-raw-us-east-2-dev/edb_metadata_extractor/input/drug_program_original.json",
    "root_element": "items"
}
```

***Extractor Output -Drugs_Program_metadata.json***
```JSON
{
	"config": {
		"dataset_name": "Drugs_Program",
		"input_file_type": "json",
		"input_file_path": "s3://lly-edp-raw-us-east-2-dev/edb_metadata_extractor/input/drug_program_original.json",
		"root_element": "items"
	},
	"explode_metadata": [
		"items.companyId",
		"items.companyName",
		"items.companyRelationship",
		"items.copyrightNotice",
		"items.countryCode",
		"items.countryName",
		"items.currentDevelopmentStatus",
		"items.currentStatus",
		"items.diseaseName",
		"items.drugId",
		"items.drugNameSynonyms",
		"items.drugPrimaryName",
		"items.globalStatus",
		"items.highestDevelopmentStatus",
		"items.highestStatusReached",
		"items.indicationGroup",
		"items.mechanismOfAction",
		"items.recordUrl",
		"items.regionName",
		"items.type"
	],
	"pk_col_list": [
		"items.companyId",
		"items.companyName",
		"items.companyRelationship",
		"items.copyrightNotice",
		"items.countryCode",
		"items.countryName",
		"items.currentDevelopmentStatus",
		"items.currentStatus",
		"items.diseaseName",
		"items.drugId",
		"items.drugPrimaryName",
		"items.globalStatus",
		"items.highestDevelopmentStatus",
		"items.highestStatusReached",
		"items.recordUrl",
		"items.type"
	]
}
```

***Normaliser Input - Drugs_Program.json***
```JSON
{
	"config": {
		"dataset_name": "Drugs_Program",
		"input_file_type": "json",
		"input_file_path": "s3://lly-edp-raw-us-east-2-dev/edb_metadata_extractor/input/drug_program_original.json",
		"root_element": "items"
	},
	"explode_metadata": [
		"items.companyId",
		"items.companyName",
		"items.companyRelationship",
		"items.copyrightNotice",
		"items.countryCode",
		"items.countryName",
		"items.currentDevelopmentStatus",
		"items.currentStatus",
		"items.diseaseName",
		"items.drugId",
		"items.drugNameSynonyms",
		"items.drugPrimaryName",
		"items.globalStatus",
		"items.highestDevelopmentStatus",
		"items.highestStatusReached",
		"items.indicationGroup",
		"items.mechanismOfAction",
		"items.recordUrl",
		"items.regionName",
		"items.type"
	],
	"pk_col_list": [
		"items.companyId",
		"items.companyName",
		"items.companyRelationship",
		"items.copyrightNotice",
		"items.countryCode",
		"items.countryName",
		"items.currentDevelopmentStatus",
		"items.currentStatus",
		"items.diseaseName",
		"items.drugId",
		"items.drugPrimaryName",
		"items.globalStatus",
		"items.highestDevelopmentStatus",
		"items.highestStatusReached",
		"items.recordUrl",
		"items.type"
	],
	"primary_key": {"drugId":"drug_id_pk"}
}
```

***Normaliser output - Drugs_Program_metadata.json***
```JSON
{
	"config": {
		"dataset_name": "Drugs_Program",
		"input_file_type": "json",
		"input_file_path": "s3://lly-edp-raw-us-east-2-dev/edb_metadata_extractor/input/drug_program_original.json",
		"root_element": "items"
	},
	"explode_metadata": [
		"items.companyId",
		"items.companyName",
		"items.companyRelationship",
		"items.copyrightNotice",
		"items.countryCode",
		"items.countryName",
		"items.currentDevelopmentStatus",
		"items.currentStatus",
		"items.diseaseName",
		"items.drugId",
		"items.drugNameSynonyms",
		"items.drugPrimaryName",
		"items.globalStatus",
		"items.highestDevelopmentStatus",
		"items.highestStatusReached",
		"items.indicationGroup",
		"items.mechanismOfAction",
		"items.recordUrl",
		"items.regionName",
		"items.type"
	],
	"pk_col_list": [
		"items.companyId",
		"items.companyName",
		"items.companyRelationship",
		"items.copyrightNotice",
		"items.countryCode",
		"items.countryName",
		"items.currentDevelopmentStatus",
		"items.currentStatus",
		"items.diseaseName",
		"items.drugId",
		"items.drugPrimaryName",
		"items.globalStatus",
		"items.highestDevelopmentStatus",
		"items.highestStatusReached",
		"items.recordUrl",
		"items.type"
	],
	"primary_key": {"drugId":"drug_id_pk"},

	"hierarchical_metadata": {
		"items_items_row_drugNameSynonyms": ["drugNameSynonyms", "drug_id_pk"],
		"items_items_row_indicationGroup": ["indicationGroup", "drug_id_pk"],
		"items_items_row_mechanismOfAction": ["mechanismOfAction", "drug_id_pk"],
		"items_items_row_regionName": ["regionName", "drug_id_pk"]
	}
}
```

***Mapping Input - Drugs_Program_mapping1.json***
```JSON
{
	"config": {
		"dataset_name": "Drugs_Program",
		"input_file_type": "json",
		"input_file_path": "s3://lly-edp-raw-us-east-2-dev/edb_metadata_extractor/input/drug_program_original.json",
		"root_element": "items"
	},
	"explode_metadata": [
		"items.companyId",
		"items.companyName",
		"items.companyRelationship",
		"items.copyrightNotice",
		"items.countryCode",
		"items.countryName",
		"items.currentDevelopmentStatus",
		"items.currentStatus",
		"items.diseaseName",
		"items.drugId",
		"items.drugNameSynonyms",
		"items.drugPrimaryName",
		"items.globalStatus",
		"items.highestDevelopmentStatus",
		"items.highestStatusReached",
		"items.indicationGroup",
		"items.mechanismOfAction",
		"items.recordUrl",
		"items.regionName",
		"items.type"
	],
	"pk_col_list": [
		"items.companyId",
		"items.companyName",
		"items.companyRelationship",
		"items.copyrightNotice",
		"items.countryCode",
		"items.countryName",
		"items.currentDevelopmentStatus",
		"items.currentStatus",
		"items.diseaseName",
		"items.drugId",
		"items.drugPrimaryName",
		"items.globalStatus",
		"items.highestDevelopmentStatus",
		"items.highestStatusReached",
		"items.recordUrl",
		"items.type"
	],
	"primary_key": {"drugId":"drug_id_pk"},

	"hierarchical_metadata": {
		"items_items_row_drugNameSynonyms": ["drugNameSynonyms", "drug_id_pk"],
		"items_items_row_indicationGroup": ["indicationGroup", "drug_id_pk"],
		"items_items_row_mechanismOfAction": ["mechanismOfAction", "drug_id_pk"],
		"items_items_row_regionName": ["regionName", "drug_id_pk"]
	},
	"mapping_id": "mapping1",
	"output_type": "explode/hierarchy",
	"output_file_type": "csv"
}
```

***Mapping Output- Drugs_Program_mapping1_output.json***
```JSON
{
	"config": {
		"dataset_name": "Drugs_Program",
		"input_file_type": "json",
		"input_file_path": "s3://lly-edp-raw-us-east-2-dev/edb_metadata_extractor/input/drug_program_original.json",
		"root_element": "items"
	},
	"explode_metadata": [
		"items.companyId",
		"items.companyName",
		"items.companyRelationship",
		"items.copyrightNotice",
		"items.countryCode",
		"items.countryName",
		"items.currentDevelopmentStatus",
		"items.currentStatus",
		"items.diseaseName",
		"items.drugId",
		"items.drugNameSynonyms",
		"items.drugPrimaryName",
		"items.globalStatus",
		"items.highestDevelopmentStatus",
		"items.highestStatusReached",
		"items.indicationGroup",
		"items.mechanismOfAction",
		"items.recordUrl",
		"items.regionName",
		"items.type"
	],
	"pk_col_list": [
		"items.companyId",
		"items.companyName",
		"items.companyRelationship",
		"items.copyrightNotice",
		"items.countryCode",
		"items.countryName",
		"items.currentDevelopmentStatus",
		"items.currentStatus",
		"items.diseaseName",
		"items.drugId",
		"items.drugPrimaryName",
		"items.globalStatus",
		"items.highestDevelopmentStatus",
		"items.highestStatusReached",
		"items.recordUrl",
		"items.type"
	],
	"primary_key": {"drugId":"drug_id_pk"},

	"hierarchical_metadata": {
		"items_items_row_drugNameSynonyms": ["drugNameSynonyms", "drug_id_pk"],
		"items_items_row_indicationGroup": ["indicationGroup", "drug_id_pk"],
		"items_items_row_mechanismOfAction": ["mechanismOfAction", "drug_id_pk"],
		"items_items_row_regionName": ["regionName", "drug_id_pk"]
	},
	"mapping_id": "mapping1",
	"output_type": "explode/hierarchy",
	"mapping": {"items_items_row_drugNameSynonyms": {"drugNameSynonyms": "drugNameSynonyms","drug_id_pk": "drug_identifier_pk"},"items_items_row_indicationGroup": {"indicationGroup": "indicationGroup","drug_id_pk": "drug_id_pk"},"items_items_row_mechanismOfAction": {"mechanismOfAction": "mechanismOfAction","drug_id_pk": "drug_id_pk"},"items_items_row_regionName": {"regionName": "regionName","drug_id_pk": "drug_id_pk"}}
	"output_file_type": "csv"
}
```



## Error handling and Notifications


All errors that are encountered during processing of data (within glue ) will be handled in try...except blocks and fatal errors will be written to application logs with "ERROR" info level. 

Ticket will be logged on Service Now.


## Logging

Standard logging functionality will be implemented and logs are written to lambda output.

## Code Components


The following code components are used by the process described above:

- Glue (to be updated)


 
 ## Interfaces

A new UI for complex data parsers would be created to get user inputs for parsing the data like Dataset name, Dataset Path, File type, root element, row_element, Mapping id etc and will trigger the glue jobs with the config file created with user inputs.
Users will be notified of the job's completion or Failure with appropriate details through an email

 
## AWS Service and Component
Sr. No | Service Component |	Name
---------------------- | ----------------------- | -----------------------
1	| AWS Glue	| edb_metadata_extractor |
2	| AWS Glue	| edb_complex_data_hierarchical_metadata_generator |
3	| AWS Glue	| cdp_json_hierarchical_converter |
4	| AWS Glue	| edb_csv_parquet_transformer_core |
5	| AWS Glue	| cdp_json_explode_converter |
6	| AWS Glue	| edb_cdp_xml_explode_converter |
7	| AWS Glue	| edb_cdp_xml_hierarchy_converter |
8	| AWS Glue	| edb_cdp_json_converter |











