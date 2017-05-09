import Ember from 'ember';

var ID_FILTERS = ['contributors', 'funders', 'publishers'];

export default Ember.Component.extend({
    filters: null,
    init () {
      this._super(...arguments);
      let parameters = this.get('parameters');
      var filters = Object.keys(parameters).filter((key) => {
        return key !== "page";
      }).map((key) => {
        return {
          "key": key,
          "value": parameters[key]
        }
      });

      // Find and format all query params that use ids for the value
      var ids = filters.filter((item) => {
          return ID_FILTERS.indexOf(item.key) !== -1;
      }).map((param) => {
          return {key: param.value}
      });

      // Fetch display names
      if (ids.length > 0) {
        this.fetchAgentDetails(ids).then((data) => {
          if (filters) {
            var displayFilters = filters.map((filter) => {
              var value = filter.value;
              data.forEach((agentData) => {
                if (value === agentData.id) {
                  value = agentData.name;
                }
              });
              return {key: filter.key, value: value};
            });
            this.set('filters', displayFilters);
          }
        });
      }},

    fetchAgentDetails: async function(agentList) {
        let agent_details = await Ember.$.ajax({
            url: 'https://dev-labs.cos.io/bulk_get_agents',
            crossDomain: true,
            data: JSON.stringify(agentList),
            type: 'POST',
            contentType: 'application/json'
        });
        return JSON.parse(agent_details);
    },

    actions: {

        removeFilter(filter) {
            let queryParams = {};
            queryParams[filter.key] = undefined;
            this.attrs.transitionToFacet("search", queryParams);
        },

        transitionToFacet(parameter, parameterValue) {
            let queryParams = {};
            queryParams[parameter] = parameterValue;
            this.attrs.transitionToFacet("search", queryParams);
        }

    }

});
