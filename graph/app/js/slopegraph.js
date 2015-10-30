var d3 = require('d3');
var pym = require('pym.js');
var _ = require('lodash');

// Global config
var GRAPHIC_DEFAULT_WIDTH = 600;
var MOBILE_THRESHOLD = 500;
var SIDEBAR_THRESHOLD = 280;
var GRAPHIC_DATA_URL = 'data/wiretaps.csv'
var GRAPHIC_METADATA = {
    startLabel: '2010',
    endLabel: '2014'
};
var voronoi;

var COLORS = ["#1b9efc", "#fecb2e", "#18a943", "#e82319", "#9f1abc", "#1fc2c1", "#fc6621"];
// Global vars
var pymChild = null;
var isMobile = false;
var isSidebar = false;
var graphicData = null;



/*
 * Initialize graphic
 */
var onWindowLoaded = function() {
    // if (Modernizr.svg) {
        // loadLocalData(GRAPHIC_DATA);
        loadCSV('data.csv')
    // } else {
        // pymChild = new pym.Child({});
    // }
}

/*
 * Load graphic data from a local source.
 */
var loadLocalData = function(data) {
    graphicData = data;

    formatData();


    pymChild = new pym.Child({
        renderCallback: render
    });
}

/*
 * Load graphic data from a CSV.
 */
var loadCSV = function(url) {
    d3.csv(GRAPHIC_DATA_URL, function(error, data) {
        graphicData = _.take(data, 30);

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
    graphicData.forEach(function(d) {
        d['2010'] = +d['2010'];
        d['2014'] = +d['2014'];
    });
}

/*
 * Render the graphic(s). Called by pym with the container width.
 */
var render = function(containerWidth) {
    if (!containerWidth) {
        containerWidth = getWidth();
    }

    if (containerWidth <= MOBILE_THRESHOLD) {
        isMobile = true;
    } else {
        isMobile = false;
    }

    if (containerWidth <= SIDEBAR_THRESHOLD) {
        isSidebar = true;
    } else {
        isSidebar = false;
    }

    // Render the chart!
    renderSlopegraph({
        container: '#graphic',
        width: containerWidth,
        data: graphicData,
        metadata: GRAPHIC_METADATA
    });

    // Update iframe
    if (pymChild) {
        pymChild.sendHeight();
    }
}

/*
 * Render a line chart.
 */
var renderSlopegraph = function(config) {
    /*
     * Setup
     */
    var labelColumn = 'jurisdiction';
    var startColumn = '2010';
    var endColumn = '2014';

    var startLabel = config['metadata']['startLabel'];
    var endLabel = config['metadata']['endLabel'];

    var aspectWidth = 5;
    var aspectHeight = 5;

    var margins = {
        top: 20,
        right: 185,
        bottom: 20,
        left: 40
    };
    
    var ticksX = 2;
    var ticksY = 10;
    var roundTicksFactor = 4;
    var dotRadius = 3;
    var labelGap = 42;

    // Mobile
    if (isSidebar) {
        aspectWidth = 2;
        aspectHeight = 3;
        margins['left'] = 30;
        margins['right'] = 105;
        labelGap = 32;
    } else if (isMobile) {
        aspectWidth = 2.5
        aspectHeight = 3;
        margins['right'] = 145;
    }

    // Calculate actual chart dimensions
    var chartWidth = config['width'] - margins['left'] - margins['right'];
    var chartHeight = Math.ceil((config['width'] * aspectHeight) / aspectWidth) - margins['top'] - margins['bottom'];
    
    voronoi = d3.geom.voronoi()
        .x(function(d) { return xScale(d.year); })
        .y(function(d) { return yScale(d.taps); })
        .clipExtent([[-margins.left, -margins.top], [chartWidth + margins.right, chartHeight + margins.bottom]]);


    // Clear existing graphic (for redraw)
    var containerElement = d3.select(config['container']);
    containerElement.html('');

    /*
     * Create D3 scale objects.
     */
    var xScale = d3.scale.ordinal()
        .domain([startLabel, endLabel])
        .range([0, chartWidth])

    var yScale = d3.scale.linear()
        .domain([
            d3.min(config['data'], function(d) {
                return Math.floor(d[startColumn] / roundTicksFactor) * roundTicksFactor;
            }),
            d3.max(config['data'], function(d) {
                return Math.ceil(d[endColumn] / roundTicksFactor) * roundTicksFactor;
            })
        ])
        .range([chartHeight, 0]);

    var colorScale = d3.scale.ordinal()
        .domain(_.pluck(config['data'], labelColumn))
        .range(COLORS);

    /*
     * Create D3 axes.
     */
    var xAxisTop = d3.svg.axis()
        .scale(xScale)
        .orient('top')
        .ticks(ticksX)
        .tickFormat(function(d) {
            return d;
        });

    var xAxis = d3.svg.axis()
        .scale(xScale)
        .orient('bottom')
        .ticks(ticksX)
        .tickFormat(function(d) {
            return d;
        });

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

    // chartElement.append('rect')
        // .attr('width', chartWidth)
        // .attr('height', chartHeight)
        // .attr("fill", "#E5E5E5");

    
    /*
     * Render lines to chart.
     */
    chartElement.append('g')
        .attr('class', 'lines')
        .selectAll('line')
        .data(config['data'])
        .enter()
        .append('line')
            .attr('class', function(d, i) {
                return 'line ' + classify(d[labelColumn]);
            })
            .attr('x1', xScale(startLabel))
            .attr('y1', function(d) {
                return yScale(d[startColumn]);
            })
            .attr('x2', xScale(endLabel))
            .attr('y2', function(d) {
                return yScale(d[endColumn]);
            })
            .style('stroke', function(d) {
                return colorScale(d[labelColumn])
            })
            .on('mouseover', function(d) {
                var label = chartElement.select('.label').select('.' + classify(d[labelColumn]));
                label.attr('opacity', 1);
            })
            .on('mouseout', function(d) {
                var label = chartElement.select('.label').select('.' + classify(d[labelColumn]));
                label.attr('opacity', 0);
            });



    /*
     * Uncomment if needed:
     * Move a particular line to the front of the stack
     */
    chartElement.select('line.california-riverside').moveToFront();


    /*
     * Render dots to chart.
     */
    
    chartElement.append('g')
        .attr('class', 'dots end')
        .selectAll('circle')
        .data(config['data'])
        .enter()
        .append('circle')
            .attr('cx', xScale(endLabel))
            .attr('cy', function(d) {
                return yScale(d[endColumn]);
            })
            .attr('class', function(d) {
                return classify(d[labelColumn]);
            })
            .attr('r', dotRadius)
            .style('fill', function(d) {
                return colorScale(d[labelColumn])
            });

    /*
     * Render values.
     */
    chartElement.append('g')
        .attr('class', 'value start')
        .selectAll('text')
        .data(config['data'])
        .enter()
        .append('text')
            .attr('x', xScale(startLabel))
            .attr('y', function(d) {
                return yScale(d[startColumn]);
            })
            .attr('text-anchor', 'end')
            .attr('dx', -6)
            .attr('dy', 3)
            .attr('opacity', 0)
            .attr('class', function(d) {
                return classify(d[labelColumn]);
            })
            .text(function(d) {
                if (isSidebar) {
                    return d[startColumn];
                }

                return d[startColumn];
            });
    chartElement.selectAll('circle.california-riverside').moveToFront();

    chartElement.append('g')
        .attr('class', 'value end')
        .selectAll('text')
        .data(config['data'])
        .enter()
        .append('text')
            .attr('x', xScale(endLabel))
            .attr('y', function(d) {
                return yScale(d[endColumn]);
            })
            .attr('text-anchor', 'begin')
            .attr('dx', 6)
            .attr('dy', 3)
            .attr('class', function(d) {
                return classify(d[labelColumn]);
            })
            .attr('opacity', 0)
            .text(function(d) {
                if (isSidebar) {
                    return d[endColumn];
                }
                
                return d[endColumn];
            });

    
    /*
     * Render labels.
     */
    chartElement.append('g')
        .attr('class', 'label')
        .selectAll('text')
        .data(config['data'])
        .enter()
        .append('text')
            .attr('x', xScale(endLabel))
            .attr('y', function(d) {
                return yScale(d[endColumn]);
            })
            .attr('text-anchor', 'begin')
            .attr('dx', function(d) {
                return labelGap;
            })
            .attr('dy', function(d) {
                return 3;
            })
            .attr('class', function(d, i) {
                return 'column-label ' + classify(d[labelColumn]);
            })
            .attr('opacity', 0)
            .text(function(d) {
                return d[labelColumn];
            })
            .call(wrapText, (margins['right'] - labelGap), 16);

    var curtainWidth = chartWidth + margins['left'] + margins['right'];
    var curtainHeight = chartHeight + margins['top'] + margins['bottom']

    var curtain = chartElement.append('rect')
        .attr('x', -1 * curtainWidth)
        .attr('y', -1 * curtainHeight)
        .attr('height', curtainHeight)
        .attr('width', curtainWidth)
        .attr('class', 'curtain')
        .attr('transform', 'rotate(180) translate(25, 25)')
        .style('fill', '#ffffff');

    /*
     * Render start dots to chart.
     */
    chartElement.append('g')
        .attr('class', 'dots start')
        .selectAll('circle')
        .data(config['data'])
        .enter()
        .append('circle')
            .attr('cx', xScale(startLabel))
            .attr('cy', function(d) {
                return yScale(d[startColumn]);
            })
            .attr('class', function(d) {
                return classify(d[labelColumn]);
            })
            .attr('r', dotRadius)
            .style('fill', function(d) {
                return colorScale(d[labelColumn])
            });


    /*
     * Render axes to chart.
     */
     chartElement.append('g')
         .attr('class', 'x axis')
         .call(xAxisTop);

    chartElement.append('g')
        .attr('class', 'x axis')
        .attr('transform', makeTranslate(0, chartHeight))
        .call(xAxis);


    var t = chartElement.transition()
        .delay(200)
        .duration(3000)
        .ease('linear');

      t.select('rect.curtain')
        .attr('width', 0);

    /*
     * Render voronoi cells
     */
    var voronoiData = graphicData.map(function(d) {
        var r = {
            jurisdiction: d.jurisdiction,
            entries: [
                {
                    jurisdiction: d.jurisdiction,
                    year: "2010",
                    taps: d["2010"]
                },
                {
                    jurisdiction: d.jurisdiction,
                    taps: d["2014"],
                    year: "2014"
                }
            ]
        };
        return r;

    });


    var voronoiGroup = chartElement.append("g")
      .attr("class", "voronoi");

    voronoiGroup.selectAll("path")
        .data(voronoi(d3.nest()
              .key(function(d) { return xScale(d.year) + "," + yScale(d.taps); })
              .rollup(function(v) { return v[0]; })
              .entries(d3.merge(voronoiData.map(function(d) { return d.entries; })))
              .map(function(d) { return d.values; })))
        .enter().append("path")
          .attr("d", function(d) { return "M" + d.join("L") + "Z"; })
          .datum(function(d, i) { return d.point; })
          .on("mouseover", mouseover)
          .on("mouseout", mouseout);

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
    var label = d3.select('.label').select('.' + classify(d.jurisdiction));
    var value = d3.selectAll('.value').select('.' + classify(d.jurisdiction));
    var line = d3.select('.lines').select('.' + classify(d.jurisdiction));
    label.attr('opacity', 1);
    value.attr('opacity', 1);
    line.classed('line--hover', true);
    line.moveToFront();
}

function mouseout(d) {
    var label = d3.select('.label').select('.' + classify(d.jurisdiction));
    var value = d3.selectAll('.value').select('.' + classify(d.jurisdiction));
    var line = d3.select('.lines').select('.' + classify(d.jurisdiction));
    value.attr('opacity', 0);
    label.attr('opacity', 0);
    line.classed('line--hover', false);
}

/*
 * Select an element and move it to the front of the stack
 */
d3.selection.prototype.moveToFront = function() {
    return this.each(function(){
        this.parentNode.appendChild(this);
    });
};

/*
 * Create a SVG tansform for a given translation.
 */
var makeTranslate = function(x, y) {
    var transform = d3.transform();

    transform.translate[0] = x;
    transform.translate[1] = y;

    return transform.toString();
};

/*
 * Convert arbitrary strings to valid css classes.
 * via: https://gist.github.com/mathewbyrne/1280286
 *
 * NOTE: This implementation must be consistent with the Python classify
 * function defined in base_filters.py.
 */
var classify = function(str) {
    return str.toLowerCase()
        .replace(/\s+/g, '-')           // Replace spaces with -
        .replace(/[^\w\-]+/g, '')       // Remove all non-word chars
        .replace(/\-\-+/g, '-')         // Replace multiple - with single -
        .replace(/^-+/, '')             // Trim - from start of text
        .replace(/-+$/, '');            // Trim - from end of text
}

var getWidth = function() {
    var width = GRAPHIC_DEFAULT_WIDTH;
    var winWidth = window.innerWidth;
    if (winWidth < width) {
        width = winWidth;
    }
    return width;
};
/*
 * Initially load the graphic
 * (NB: Use window.load to ensure all images have loaded)
 */
window.onload = onWindowLoaded;
