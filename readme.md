#Wiretaps data conversion and analysis

##What is this?

A set of data, tools, and instructions for analyzing and converting wiretaps data

##Requirements
You'll need a few tools intalled to work with this data.

First up, you'll need Postgres running locally. If you don't have it, I reccomend installing via Homebrew with
```
brew install postgresql
```

Create a database called wiretaps
```
createdb wiretaps
```

and then enable the tablefunc extension with

```
psql -d wiretaps -c 'CREATE EXTENSION tablefunc;'
```

Now the database is ready to go. Now set up a python environment and install python requirements

```
pip install -r requirements.txt
```

##Analysis & data conversion steps

### Getting data into and out of the database

First, convert the source spreadsheet into csv with csvkit.

```
in2csv --sheet data source_data/summary-combined.xlsx > source_data/wiretaps_data.csv
```


The [wiretaps.sql](wiretaps.sql) file has for creating a postgres table and querying the data. 

