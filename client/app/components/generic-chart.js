/* global c3 */
import Ember from 'ember';

export default Ember.Component.extend({

    classNames: ['chart'],
    charttitle: 'Untitled Chart',

    dataChanged: Ember.observer('aggregations', function() {
        this.updateChart();
    }),

    data: [],

    sizeChanged: Ember.observer('resizedSignal', function() {
        if (this.get('resizedSignal') == false) return;
        this.updateChart();
        this.set('resizedSignal', false); 
        //debugger;
    }),

    charTypeChange: Ember.observer('chartType', function(){
        this.updateChart();
    }),

    updateChart() {

        let chart_type = this.get('chartType');

        let chart_options = {
            bindto: this.element,
            data: {
                columns: null, //to be filled later
                type: chart_type,
                onclick: (d) => {
                    this.attrs.transitionToFacet(d);
                },
            },
            legend: { show: false },
            [chart_type]: {
                title: this.get('charttitle'),  //to be filled later
                label: {
                    show: false
                }
            },
            //size: {
            //    height: this.get('height')*150 - 20,
            //    width: this.get('width')*150
            //},
        };

        if (chart_type == 'donut') {

            this.set('data', this.get('aggregations.sources.buckets'));
            var columns = this.get('data').map(({ key, doc_count }) => [key, doc_count]);
            var title = 'Published in...';

        } else if (chart_type == 'bar') {

            this.set('data', this.get('aggregations.contributors.buckets'));
            var columns = this.get('data').map(({ key, doc_count }) => [key, doc_count]).slice(0, 10);

            chart_options['axis'] = {
                x: {
                    tick: {
                        format: function() {
                            return 'Top 10 Contributors';
                        }
                    }
                },
                y: {
                     label: 'Number of Publications'
                },
            };
            chart_options['tooltip'] = {
                grouped: false, // Default true
            };
            chart_options['tooltip'] = tooltip;

        } else if (chart_type == 'relevanceHistogram') {

            var columns = [
                //['x'].concat(this.get('aggregations.all_score.buckets').map((datum) => {
                //    return datum.key
                //})),
                ['overallCountByRelevance'].concat(this.get('aggregations.all_score.buckets').map((datum) => {
                    let val = this.get('aggregations.all_score.buckets')[datum.key];
                    if (val && val.doc_count > 0) {return (Math.log(val.doc_count) / Math.LN10) + 1; }
                    return 0;
                })),
                ['ucCountByRelevance'].concat(this.get('aggregations.all_score.buckets').map((datum) => {
                    let val = this.get('aggregations.filtered_score.buckets.UC.score.buckets')[datum.key];
                    if (val && val.doc_count > 0) {return (Math.log(val.doc_count) / Math.LN10) + 1; }
                    return 0;
                })),
                ['doeCountByRelevance'].concat(this.get('aggregations.all_score.buckets').map((datum) => {
                    let val = this.get('aggregations.filtered_score.buckets.DOE.score.buckets')[datum.key];
                    if (val && val.doc_count > 0) {return (Math.log(val.doc_count) / Math.LN10) + 1; }
                    return 0;
                }))
            ];

            chart_options['axis'] = {
                x: {
                    tick: {
                        format: function(val) {
                            return val;
                        }
                    },
                    label: 'Relevance Score'
                },
                y: {
                    min: 1,
                    tick: {
                        format: function (d) { return Math.pow(10,d - 1).toFixed(0); }
                    },
                    label: 'Number of Items (Log Scale)'
                }
            };

            let zoom = {enabled: true};
            chart_options['data']['types'] = {
                x: 'area-spline',
                overallCountByRelevance: 'area-spline',
                doeCountByRelevance: 'area-spline',
                ucCountByRelevance: 'area-spline'
            };

            chart_options['data']['labels'] = {
                //labels: {
                //    format: {
                //        overallCountByRelevance: function(d,id){console.log(id, Math.pow(10,d));return Math.pow(10,d).toFixed(0);},
                //        institutionCountByRelevance: function(d,id){console.log(id, Math.pow(10,d));return Math.pow(10,d).toFixed(0);}
                //    }
                //}
            };

            chart_options['point'] = {show: false};
            chart_options['zoom'] = {enabled: true};

        } else if (chart_type == 'timeseries') {

            this.set('data', this.get('aggregations'));
            let x_axis = this.get('data').all_over_time.buckets.map((datum) => { return datum.key_as_string })
            var columns = this.get('data').sorted_by_type.buckets.map((bucket) => {
                return [bucket.key].concat(bucket.type_over_time.buckets.reduce((ret, bucket) => {
                    if (bucket && bucket.doc_count > 0) {
                        ret[x_axis.indexOf(bucket.key_as_string)] = (Math.log(bucket.doc_count) / Math.LN10) + 1 ;
                    }
                    return ret;
                }, (new Array(x_axis.length)).fill(0)));
            });
            columns.unshift(['x'].concat(x_axis))
            columns.unshift(['All Events'].concat(this.get('data').all_over_time.buckets.map((bucket) => {
                if (bucket && bucket.doc_count > 0) { return (Math.log(bucket.doc_count) / Math.Ln10) + 1; }
                return 0;
            })))
            let data_x = 'x';
            chart_options['axis'] = {
                x: {
                    type: 'timeseries',
                    tick: {
                        culling: {
                            max: 10
                        },
                        rotate: 90,
                        format: '%d-%m-%Y' // Format the tick labels on our chart
                    }
                },
                y: {
                    min: 1,
                    tick: {
                        format: function (d) { return Math.pow(10,d - 1).toFixed(0); }
                    },
                    label: 'Number of Items (Log Scale)'
                }
            };
            let data_types = columns.reduce((r, c, i, a) => {
                r[c[0]] = 'area-spline';
                return r;
            }, {});
            chart_options['tooltip'] = {
                format: { // We want to return a nice-looking tooltip whose content is determined by (or at least consistent with) sour TS intervals
                    title: function (d) {
                        return d.toString().substring(4,15); // This isn't perfect, but it's at least more verbose than before
                    }
                }
            };
            let zoom = {
                enabled: true
            };
            let point = {
                show: false,
            };

            chart_options['data']['types'] = data_types;
            chart_options['data']['x'] = data_x;
            chart_options['legend'] = { position: "right" };
            chart_options['zoom'] = zoom;
            chart_options['point'] = point;

        }

        chart_options['data']['columns'] = columns;
        chart_options[chart_type]['title'] = title;
        this.set('chart', c3.generate(chart_options));

    },

    didRender() {
        this.updateChart();
    },

});