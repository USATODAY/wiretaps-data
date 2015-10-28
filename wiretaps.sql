CREATE TABLE reports
(year VARCHAR(4), type VARCHAR(150), state VARCHAR(250), jurisdiction VARCHAR(250), full_jurisdiction VARCHAR(250), taps INTEGER);

SELECT jurisdictions.* 
FROM (SELECT year, upper(full_jurisdiction), SUM(taps) FROM reports
GROUP BY upper(full_jurisdiction), year) as jurisdictions
GROUP BY full_jurisdiction;

SELECT * FROM
crosstab(
	'SELECT upper(full_jurisdiction), year, taps
	FROM reports
	ORDER BY 1,2',
	$$VALUES ('2010'::VARCHAR(4)), ('2011'), ('2012'), ('2013'), ('2014')$$
)
AS taps ("jurisdiction" TEXT, "2010" INTEGER, "2011" INTEGER, "2012" INTEGER, "2013" INTEGER, "2014" INTEGER)
WHERE "2010" IS NOT NULL 
AND "2014" IS NOT NULL
ORDER BY "2014" DESC;


CREATE VIEW taps_by_jurisdiction_year AS 
SELECT * FROM
crosstab(
	'SELECT upper(full_jurisdiction), year, taps
	FROM reports
	ORDER BY 1,2',
	$$VALUES ('2010'::VARCHAR(4)), ('2011'), ('2012'), ('2013'), ('2014')$$
)
AS taps ("jurisdiction" TEXT, "2010" INTEGER, "2011" INTEGER, "2012" INTEGER, "2013" INTEGER, "2014" INTEGER);

SELECT * FROM taps_by_jurisdiction_year
WHERE "2010" IS NOT NULL 
AND "2014" IS NOT NULL
ORDER BY "2014" DESC;

COPY taps_by_jurisdiction_year TO '/Users/mthorson/github/2015/wiretaps-data/output_data/wiretaps.csv' DELIMITERS ',' CSV HEADER;
