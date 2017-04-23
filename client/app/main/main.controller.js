'use strict';

(function() {

class MainController {

  constructor($http, $scope, socket) {
    this.$http = $http;
    this.socket = socket;
    this.clusters = [];
    this.venue_to_cluster_mapping = {};
    this.cluster_to_icon_mapping = {};
    this.venues = [];
    this.markers = [];
    this.query = "";
    this.cluster_to_polygon_arrays = [];
    this.cluster_polygon_array = [];
    this.selected_cluster = null;
    this.cluster_id_to_cluster_mapping = {};
    this.neighborhoods = [];
    this.neighborhood_name_to_neighborhood_mapping = {};
    this.neighborhood_polygon_array = [];
    this.selected_neighborhood = null;

    /*$scope.$on('$destroy', function() {
      socket.unsyncUpdates('cluster');
    });*/
  }

  $onInit() {
    this.refreshClusters('baseline');
    this.refreshNeighborhoods();
  }

  haversine = function(lat1, lon1, lat2, lon2) {
    Number.prototype.toRad = function() {
       return this * Math.PI / 180;
    }

    var R = 6371; // km 
    //has a problem with the .toRad() method below.
    var x1 = lat2-lat1;
    var dLat = x1.toRad();  
    var x2 = lon2-lon1;
    var dLon = x2.toRad();  
    var a = Math.sin(dLat/2) * Math.sin(dLat/2) + 
                    Math.cos(lat1.toRad()) * Math.cos(lat2.toRad()) * 
                    Math.sin(dLon/2) * Math.sin(dLon/2);  
    var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)); 
    var d = R * c;
    return d;
  }

  triggerClusterPolygon = function(events, cluster_id, ctrl) {
    if (ctrl.selected_cluster == null) {
      ctrl.selected_cluster = ctrl.cluster_id_to_cluster_mapping[cluster_id]
    } else if (ctrl.selected_cluster.cluster_id == cluster_id) {
      return;
    }

    if (ctrl.cluster_polygon_array.length > 0) {
      ctrl.cluster_polygon_array = [];
      ctrl.selected_cluster = null;
    } else {
      var points = []
      angular.forEach(ctrl.cluster_to_polygon_arrays[cluster_id], function(polygon_array, key) {
        points.push([polygon_array['lat'], polygon_array['lon']])
      }, this);

      // 2nd parameter is concavity, so we pass a big number to ensure a convex polygon
      ctrl.cluster_polygon_array = hull(points, 10000000000);


      /*ctrl.cluster_polygon_array = [
        [ctrl.cluster_to_polygon_arrays[cluster_id]['max_lat'], ctrl.cluster_to_polygon_arrays[cluster_id]['min_lon']],
        [ctrl.cluster_to_polygon_arrays[cluster_id]['min_lat'], ctrl.cluster_to_polygon_arrays[cluster_id]['min_lon']],
        [ctrl.cluster_to_polygon_arrays[cluster_id]['min_lat'], ctrl.cluster_to_polygon_arrays[cluster_id]['max_lon']],
        [ctrl.cluster_to_polygon_arrays[cluster_id]['max_lat'], ctrl.cluster_to_polygon_arrays[cluster_id]['max_lon']]
      ]*/
    }
  }

  refreshClusters = function(algorithm) {
    this.$http.get('/api/clusters?algorithm=' + algorithm).then(response => {
      this.clusters = response.data;
      this.markers = [];
      this.venue_to_cluster_mapping = {}
      this.cluster_to_icon_mapping = {}
      this.cluster_to_polygon_arrays = {}
      this.selected_cluster = null;
      this.cluster_id_to_cluster_mapping = {}
      //this.socket.syncUpdates('cluster', this.clusters);
      var minLat = null;
      var maxLat = null;
      var minLon = null;
      var maxLon = null;

      angular.forEach(this.clusters, function(cluster, key) {
          angular.forEach(cluster.insta_place_ids, function(venue_id, key) {
            this.venue_to_cluster_mapping[venue_id] = cluster.cluster_id
        }, this);

          this.cluster_id_to_cluster_mapping[cluster.cluster_id] = cluster
          switch (cluster.cluster_id % 16) {
            case 0:
              this.cluster_to_icon_mapping[cluster.cluster_id] = {icon: 'http://maps.google.com/mapfiles/ms/micons/purple-dot.png', color: '#660066'}
              break;
            case 1:
              this.cluster_to_icon_mapping[cluster.cluster_id] = {icon: 'http://maps.google.com/mapfiles/ms/micons/green-dot.png', color: '#00FF00'}
              break;
            case 2:
              this.cluster_to_icon_mapping[cluster.cluster_id] = {icon: 'http://maps.google.com/mapfiles/ms/micons/blue-dot.png', color: '#0000FF'}
              break;
            case 3:
              this.cluster_to_icon_mapping[cluster.cluster_id] = {icon: 'http://maps.google.com/mapfiles/ms/micons/ltblue-dot.png', color: '#87CEFA'}
              break;
            case 4:
              this.cluster_to_icon_mapping[cluster.cluster_id] = {icon: 'http://maps.google.com/mapfiles/ms/micons/pink-dot.png', color: '#EE82EE'}
              break;
            case 5:
              this.cluster_to_icon_mapping[cluster.cluster_id] = {icon: 'http://maps.google.com/mapfiles/ms/micons/red-dot.png', color: '#FF0000'}
              break;
            case 6:
              this.cluster_to_icon_mapping[cluster.cluster_id] = {icon: 'http://maps.google.com/mapfiles/ms/micons/yellow-dot.png', color: '#FFFF00'}
              break;
            case 7:
              this.cluster_to_icon_mapping[cluster.cluster_id] = {icon: 'http://maps.google.com/mapfiles/kml/pal4/icon55.png', color: '#006400'}
              break;
            case 8:
              this.cluster_to_icon_mapping[cluster.cluster_id] = {icon: 'http://maps.google.com/mapfiles/ms/micons/brown-dot.png', color: '#330000'}
              break;
            case 9:
              this.cluster_to_icon_mapping[cluster.cluster_id] = {icon: 'http://maps.google.com/mapfiles/ms/micons/ltgreen-dot.png', color: '#66FF66'}
              break;
            case 10:
              this.cluster_to_icon_mapping[cluster.cluster_id] = {icon: 'http://maps.google.com/mapfiles/ms/micons/dark-yellow.png', color: '#999900'}
              break;
            case 11:
              this.cluster_to_icon_mapping[cluster.cluster_id] = {icon: 'http://maps.google.com/mapfiles/ms/micons/dark-blue.png', color: '#000066'}
              break;
            case 12:
              this.cluster_to_icon_mapping[cluster.cluster_id] = {icon: 'http://maps.google.com/mapfiles/ms/micons/ltgrey-dot.png', color: '#E0E0E0'}
              break;
            case 13:
              this.cluster_to_icon_mapping[cluster.cluster_id] = {icon: 'http://maps.google.com/mapfiles/ms/micons/orange-dot.png', color: '#FF8000'}
              break;
            case 14:
              this.cluster_to_icon_mapping[cluster.cluster_id] = {icon: 'http://maps.google.com/mapfiles/ms/micons/dark-pink-dot.png', color: '#99004C'}
              break;
            case 15:
              this.cluster_to_icon_mapping[cluster.cluster_id] = {icon: 'http://maps.google.com/mapfiles/kml/pal4/green-blue.png', color: '#009999'}
              break;
          }
      }, this);

      this.$http.get('/api/venues').then(response => {
        this.venues = response.data;

        angular.forEach(this.venues, function(venue, key) {
          // build marker based on venue and associated cluster
          if (venue.id in this.venue_to_cluster_mapping) {
            var cluster_id = this.venue_to_cluster_mapping[venue.id]
            var venue_pos = {'lat': venue.insta_place.latitude, 'lon': venue.insta_place.longitude}

            if (cluster_id in this.cluster_to_polygon_arrays) {
              this.cluster_to_polygon_arrays[cluster_id].push(venue_pos)
              /*if (this.cluster_to_polygon_arrays[cluster_id]['max_lon'] < venue.insta_place.longitude) {
                this.cluster_to_polygon_arrays[cluster_id]['max_lon'] = venue.insta_place.longitude
              }

              if (this.cluster_to_polygon_arrays[cluster_id]['min_lon'] > venue.insta_place.longitude) {
                this.cluster_to_polygon_arrays[cluster_id]['min_lon'] = venue.insta_place.longitude
              }

              if (this.cluster_to_polygon_arrays[cluster_id]['max_lat'] < venue.insta_place.latitude) {
                this.cluster_to_polygon_arrays[cluster_id]['max_lat'] = venue.insta_place.latitude
              }

              if (this.cluster_to_polygon_arrays[cluster_id]['min_lat'] > venue.insta_place.latitude) {
                this.cluster_to_polygon_arrays[cluster_id]['min_lat'] = venue.insta_place.latitude
              }*/
            } else {
              this.cluster_to_polygon_arrays[cluster_id] = []
              this.cluster_to_polygon_arrays[cluster_id].push(venue_pos)
              /*this.cluster_to_polygon_arrays[cluster_id] = {
                'max_lon': venue.insta_place.longitude,
                'min_lon': venue.insta_place.longitude,
                'max_lat': venue.insta_place.latitude,
                'min_lat': venue.insta_place.latitude
              }*/
            }

            this.markers.push({'id': venue.id,
                               'lon': venue.insta_place.longitude,
                               'lat': venue.insta_place.latitude,
                               'position': venue.insta_place.latitude.toString() + ',' + venue.insta_place.longitude.toString(),
                               'cluster_id': cluster_id,
                               'icon': this.cluster_to_icon_mapping[cluster_id].icon,
                               'color': this.cluster_to_icon_mapping[cluster_id].color,
                               'name': venue.insta_place.name})
          }
          console.log(this.markers.length)
        }, this);
      });
    });
  }

  refreshNeighborhoods = function() {
    this.$http.get('/api/neighborhoods').then(response => {
      this.neighborhoods = response.data;

      angular.forEach(this.neighborhoods, function(neighborhood, key) {
        this.neighborhood_name_to_neighborhood_mapping[neighborhood['name']] =  neighborhood
      }, this);
    });
  }

  triggerNeighborhoods = function(neighborhood_name, ctrl) {
    if (ctrl.selected_neighborhood == null) {
      ctrl.selected_neighborhood = ctrl.neighborhood_name_to_neighborhood_mapping[neighborhood_name]
    } else if (ctrl.selected_neighborhood.name == neighborhood_name) {
      return;
    }

    if (ctrl.neighborhood_polygon_array.length > 0) {
      ctrl.neighborhood_polygon_array = [];
      ctrl.selected_neighborhood = null;
    } else {
      // 2nd parameter is concavity, so we pass a big number to ensure a convex polygon
      ctrl.neighborhood_polygon_array = hull(ctrl.selected_neighborhood.coordinates, 10000000000);


      /*ctrl.cluster_polygon_array = [
        [ctrl.cluster_to_polygon_arrays[cluster_id]['max_lat'], ctrl.cluster_to_polygon_arrays[cluster_id]['min_lon']],
        [ctrl.cluster_to_polygon_arrays[cluster_id]['min_lat'], ctrl.cluster_to_polygon_arrays[cluster_id]['min_lon']],
        [ctrl.cluster_to_polygon_arrays[cluster_id]['min_lat'], ctrl.cluster_to_polygon_arrays[cluster_id]['max_lon']],
        [ctrl.cluster_to_polygon_arrays[cluster_id]['max_lat'], ctrl.cluster_to_polygon_arrays[cluster_id]['max_lon']]
      ]*/
    }
  }

  /*addThing() {
    if (this.newThing) {
      this.$http.post('/api/clusters', { name: this.newThing });
      this.newThing = '';
    }
  }*/

  /*deleteThing(thing) {
    this.$http.delete('/api/clusters/' + thing._id);
  }*/
}

angular.module('appApp')
  .component('main', {
    templateUrl: 'app/main/main.html',
    controller: MainController
  });

})();
