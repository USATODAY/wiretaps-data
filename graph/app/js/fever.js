var d3 = require('d3');
var pym = require('pym.js');
var _ = require('lodash');

// Global config
var DEFAULT_WIDTH = 600;
var MOBILE_THRESHOLD = 500;
var SIDEBAR_THRESHOLD = 280;
var GRAPHIC_DATA_URL = 'data/wiretaps.csv'
var GRAPHIC_METADATA = {
    startLabel: '2010',
    endLabel: '2014'
};
var voronoi;
var DATA = null;

var COLORS = ["#1b9efc", "#fecb2e", "#18a943", "#e82319", "#9f1abc", "#1fc2c1", "#fc6621"];
// Global vars
var pymChild = null;
var isMobile = false;
var isSidebar = false;
var dataSeries = [];

var fmtComma = d3.format(',');
var fmtYearAbbrev = d3.time.format('%y');
var fmtYearFull = d3.time.format('%Y');


/*
 * Initialize graphic
 */
var onWindowLoaded = function() {
    // if (Modernizr.svg) {
    //     formatData();
    //
    //     pymChild = new pym.Child({
    //         renderCallback: render
    //     });
    // } else {
    //     pymChild = new pym.Child({});
    // }
    loadCSV();
}

var loadCSV = function() {
    d3.csv(GRAPHIC_DATA_URL, function(error, data) {
        DATA = _.take(data, 20);

        formatData();

        pymChild = new pym.Child({
            renderCallback: render
        });
    });
}

/*
 * Format graphic data for processing by D3.
 */
var formatData = function() {
    DATA.forEach(function(d) {
        // d['date'] = d3.time.format('%m/%d/%y').parse(d['date']);

        for (var key in d) {
            if (key != 'jurisdiction' && d[key] != null && d[key].length > 0) {
                d[key] = +d[key];
            }
        }
        
        dataSeries.push({
            'name': d.jurisdiction,
            'values': _.without(_.keys(d), 'jurisdiction').map(function(k) {
                return {'amt':d[k], 'date': d3.time.format('%Y').parse(k)};
            })
        });
    });

    /*
     * Restructure tabular data for easier charting.
     */
    // for (var column in DATA[0]) {
    //     if (column == 'jurisdiction') {
    //         continue;
    //     }
    //
    //     dataSeries.push({
    //         'name': d.jurisdiction,
    //         'values': DATA.map(function(d) {
    //             return {
    //                 'date': d['date'],
    //                 'amt': d[column]
    //             };
    // filter out empty data. uncomment this if you have inconsistent data.
    //        }).filter(function(d) {
    //            return d['amt'].length > 0;
    //         })
    //     });
    // }
}

/*
 * Render the graphic(s). Called by pym with the container width.
 */
var render = function(containerWidth) {
    if (!containerWidth) {
        containerWidth = DEFAULT_WIDTH;
    }

    if (containerWidth <= MOBILE_THRESHOLD) {
        isMobile = true;
    } else {
        isMobile = false;
    }

    // Render the chart!
    renderLineChart({
        container: '#graphic',
        width: containerWidth,
        data: dataSeries
    });

    // Update iframe
    if (pymChild) {
        pymChild.sendHeight();
    }
}

/*
 * Render a line chart.
 */
var renderLineChart = function(config) {
    /*
     * Setup
     */
    var dateColumn = 'date';
    var valueColumn = 'amt';

    var aspectWidth = isMobile ? 4 : 16;
    var aspectHeight = isMobile ? 3 : 9;

    var margins = {
        top: 5,
        right: 90,
        bottom: 20,
        left: 30
    };

    var ticksX = 5;
    var ticksY = 10;
    var roundTicksFactor = 5;

    // Mobile
    if (isMobile) {
        ticksX = 5;
        ticksY = 5;
        margins['right'] = 25;
    }

    // Calculate actual chart dimensions
    var chartWidth = config['width'] - margins['left'] - margins['right'];
    var chartHeight = Math.ceil((config['width'] * aspectHeight) / aspectWidth) - margins['top'] - margins['bottom'];

    // Clear existing graphic (for redraw)
    var containerElement = d3.select(config['container']);
    containerElement.html('');

    /*
     * Create D3 scale objects.
     */
    var xScale = d3.time.scale()
        .domain(d3.extent(config['data'][0]['values'], function(d) {
            return d['date'];
        }))
        .range([ 0, chartWidth ])

    var min = d3.min(config['data'], function(d) {
        return d3.min(d['values'], function(v) {
            return Math.floor(v[valueColumn] / roundTicksFactor) * roundTicksFactor;
        })
    });

    if (min > 0) {
        min = 0;
    }

    var max = d3.max(config['data'], function(d) {
        return d3.max(d['values'], function(v) {
            return Math.ceil(v[valueColumn] / roundTicksFactor) * roundTicksFactor;
        })
    });

    var yScale = d3.scale.linear()
        .domain([min, max])
        .range([chartHeight, 0]);

    var colorScale = d3.scale.ordinal()
        .domain(_.pluck(config['data'], 'name'))
        .range(COLORS);

    voronoi = d3.geom.voronoi()
        .x(function(d) { return xScale(d.date); })
        .y(function(d) { return yScale(d.amt); })
        .clipExtent([[-margins.left, -margins.top], [chartWidth + margins.right, chartHeight + margins.bottom]]);

    /*
     * Render the HTML legend.
     */
    // var legend = containerElement.append('ul')
    //     .attr('class', 'key')
    //     .selectAll('g')
    //     .data(config['data'])
    //     .enter().append('li')
    //         .attr('class', function(d, i) {
    //             return 'key-item ' + classify(d['name']);
    //         });
    //
    // legend.append('b')
    //     .style('background-color', function(d) {
    //         return colorScale(d['name']);
    //     });
    //
    // legend.append('label')
    //     .text(function(d) {
    //         return d['name'];
    //     });

    /*
     * Create the root SVG element.
     */
    var chartWrapper = containerElement.append('div')
        .attr('class', 'graphic-wrapper');

    var chartElement = chartWrapper.append('svg')
        .attr('width', chartWidth + margins['left'] + margins['right'])
        .attr('height', chartHeight + margins['top'] + margins['bottom'])
        .append('g')
        .attr('transform', 'translate(' + margins['left'] + ',' + margins['top'] + ')');

    /*
     * Create D3 axes.
     */
    var xAxis = d3.svg.axis()
        .scale(xScale)
        .orient('bottom')
        .ticks(ticksX)
        .tickFormat(function(d, i) {
            if (isMobile) {
                return '\u2019' + fmtYearAbbrev(d);
            } else {
                return fmtYearFull(d);
            }
        });

    var yAxis = d3.svg.axis()
        .scale(yScale)
        .orient('left')
        .ticks(ticksY);

    /*
     * Render axes to chart.
     */
    chartElement.append('g')
        .attr('class', 'x axis')
        .attr('transform', makeTranslate(0, chartHeight))
        .call(xAxis);

    chartElement.append('g')
        .attr('class', 'y axis')
        .call(yAxis);

    /*
     * Render grid to chart.
     */
    var xAxisGrid = function() {
        return xAxis;
    }

    var yAxisGrid = function() {
        return yAxis;
    }

    chartElement.append('g')
        .attr('class', 'x grid')
        .attr('transform', makeTranslate(0, chartHeight))
        .call(xAxisGrid()
            .tickSize(-chartHeight, 0, 0)
            .tickFormat('')
        );

    chartElement.append('g')
        .attr('class', 'y grid')
        .call(yAxisGrid()
            .tickSize(-chartWidth, 0, 0)
            .tickFormat('')
        );

    /*
     * Render lines to chart.
     */
    var line = d3.svg.line()
        // .interpolate('monotone')
        .x(function(d) {
            return xScale(d[dateColumn]);
        })
        .y(function(d) {
            return yScale(d[valueColumn]);
        });

    chartElement.append('g')
        .attr('class', 'lines')
        .selectAll('path')
        .data(config['data'])
        .enter()
        .append('path')
            .attr('class', function(d, i) {
                return 'line ' + classify(d['name']);
            })
            .attr('stroke', function(d) {
                return colorScale(d['name']);
            })
            .attr('opacity', 0.25)
            .attr('d', function(d) {
                return line(d['values']);
            });

    chartElement.append('g')
        .attr('class', 'value')
        .selectAll('text')
        .data(config['data'])
        .enter().append('text')
            .attr('x', function(d, i) {
                var last = d['values'][d['values'].length - 1];

                return xScale(last[dateColumn]) + 5;
            })
            .attr('y', function(d) {
                var last = d['values'][d['values'].length - 1];

                return yScale(last[valueColumn]) + 3;
            })
            .attr('class', function(d) {
                return classify(d['name']);
            })
            .attr('dx', 0)
            .attr('dy', 0)
            .attr('opacity', 0)
            .text(function(d) {
                var last = d['values'][d['values'].length - 1];
                var value = last[valueColumn];

                var label = last[valueColumn];

                if (!isMobile) {
                    label = d['name'] + ': ' + label;
                }

                return label;
            })
            .call(wrapText, (margins['right'] - 5), 16);
    /*
     * Render voronoi cells
     */
    var voronoiData = config['data'].map(function(d) { 
        return d.values.map(function(v){
            v.name = d.name;
            return v;
        });
    });


    var voronoiGroup = chartElement.append("g")
      .attr("class", "voronoi");


    voronoiGroup.selectAll("path")
        .data(voronoi(d3.nest()
              .key(function(d) { return xScale(d.date) + "," + yScale(d.amt); })
              .rollup(function(v) { return v[0]; })
              .entries(d3.merge(voronoiData))
              .map(function(d) { return d.values; })))
        .enter().append("path")
          .attr("d", function(d) { return "M" + d.join("L") + "Z"; })
          .datum(function(d, i) { return d.point; })
          .on("mouseover", mouseover)
          .on("mouseout", mouseout);



}

/*
 * Create a SVG tansform for a given translation.
 */
var makeTranslate = function(x, y) {
    var transform = d3.transform();

    transform.translate[0] = x;
    transform.translate[1] = y;

    return transform.toString();
};

var classify = function(str) {
    return str.toLowerCase()
        .replace(/\s+/g, '-')           // Replace spaces with -
        .replace(/[^\w\-]+/g, '')       // Remove all non-word chars
        .replace(/\-\-+/g, '-')         // Replace multiple - with single -
        .replace(/^-+/, '')             // Trim - from start of text
        .replace(/-+$/, '');            // Trim - from end of text
}

/*
 * Wrap a block of text to a given width
 * via http://bl.ocks.org/mbostock/7555321
 */
var wrapText = function(texts, width, lineHeight) {
    texts.each(function() {
        var text = d3.select(this);
        var words = text.text().split(/\s+/).reverse();

        var word = null;
        var line = [];
        var lineNumber = 0;

        var x = text.attr('x');
        var y = text.attr('y');

        var dx = parseFloat(text.attr('dx'));
        var dy = parseFloat(text.attr('dy'));

        var tspan = text.text(null)
            .append('tspan')
            .attr('x', x)
            .attr('y', y)
            .attr('dx', dx + 'px')
            .attr('dy', dy + 'px');

        while (word = words.pop()) {
            line.push(word);
            tspan.text(line.join(' '));

            if (tspan.node().getComputedTextLength() > width) {
                line.pop();
                tspan.text(line.join(' '));
                line = [word];

                lineNumber += 1;

                tspan = text.append('tspan')
                    .attr('x', x)
                    .attr('y', y)
                    .attr('dx', dx + 'px')
                    .attr('dy', lineNumber * lineHeight)
                    .attr('text-anchor', 'begin')
                    .text(word);
            }
        }
    });


}

function mouseover(d) {
    console.log(d);
    var label = d3.select('.label').select('.' + classify(d.name));
    var value = d3.selectAll('.value').select('.' + classify(d.name));
    var line = d3.select('.lines').select('.' + classify(d.name));
    // label.attr('opacity', 1);
    value.attr('opacity', 1);
    line.classed('line--hover', true);
    line.moveToFront();
}

function mouseout(d) {
    var label = d3.select('.label').select('.' + classify(d.name));
    var value = d3.selectAll('.value').select('.' + classify(d.name));
    var line = d3.select('.lines').select('.' + classify(d.name));
    value.attr('opacity', 0);
    // label.attr('opacity', 0);
    line.classed('line--hover', false);
}




/*
 * Initially load the graphic
 * (NB: Use window.load to ensure all images have loaded)
 */
window.onload = onWindowLoaded;
