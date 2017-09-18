'use strict';

(function() {

class MainController {

  constructor($http, $scope, socket, NgMap, $timeout) {
    this.$http = $http;
    this.socket = socket;
    this.NgMap = NgMap;
    this.$timeout = $timeout;
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
    this.selected_algorithm = 'baseline';
    this.sidebar_active = false;
    this.is_loaded = false;

    /*$scope.$on('$destroy', function() {
      socket.unsyncUpdates('cluster');
    });*/
  }

  $onInit() {
    this.NgMap.getMap("map").then(response => {
      this.refreshClusters('baseline');
      this.refreshNeighborhoods();
    });
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
      ctrl.score_mapping = null;
    } else {
      var points = []
      angular.forEach(ctrl.cluster_to_polygon_arrays[cluster_id], function(polygon_array, key) {
        points.push([polygon_array['lat'], polygon_array['lon']])
      }, this);

      // 2nd parameter is concavity, so we pass a big number to ensure a convex polygon
      ctrl.cluster_polygon_array = hull(points, 10000000000);

      ctrl.score_mapping = {};

      var diffToMin = Math.abs(ctrl.selected_cluster.meta_data.review_count_avg - ctrl.minReviewCount);
      var diffToAvg = Math.abs(ctrl.selected_cluster.meta_data.review_count_avg - ctrl.avgReviewCount);
      var diffToMax = Math.abs(ctrl.selected_cluster.meta_data.review_count_avg - ctrl.maxReviewCount);

      if (diffToMin < diffToAvg && diffToMin < diffToMax) {
        ctrl.score_mapping.review_score = 'Baixa';
      } else if (diffToAvg <= diffToMax) {
        ctrl.score_mapping.review_score = 'Média';
      } else {
        ctrl.score_mapping.review_score = 'Alta';
      }

      diffToMin = Math.abs(ctrl.selected_cluster.meta_data.checkin_count_avg - ctrl.minCheckinCount);
      diffToAvg = Math.abs(ctrl.selected_cluster.meta_data.checkin_count_avg - ctrl.avgCheckinCount);
      diffToMax = Math.abs(ctrl.selected_cluster.meta_data.checkin_count_avg - ctrl.maxCheckinCount);

      if (diffToMin < diffToAvg && diffToMin < diffToMax) {
        ctrl.score_mapping.checkin_score = 'Baixa';
      } else if (diffToAvg <= diffToMax) {
        ctrl.score_mapping.checkin_score = 'Média';
      } else {
        ctrl.score_mapping.checkin_score = 'Alta';
      }

      diffToMin = Math.abs(ctrl.selected_cluster.meta_data.total_rating_avg - ctrl.minTotalRating);
      diffToAvg = Math.abs(ctrl.selected_cluster.meta_data.total_rating_avg - ctrl.avgTotalRating);
      diffToMax = Math.abs(ctrl.selected_cluster.meta_data.total_rating_avg - ctrl.maxTotalRating);

      if (diffToMin < diffToAvg && diffToMin < diffToMax) {
        ctrl.score_mapping.total_rating_score = 'Baixa';
      } else if (diffToAvg <= diffToMax) {
        ctrl.score_mapping.total_rating_score = 'Média';
      } else {
        ctrl.score_mapping.total_rating_score = 'Alta';
      }

      diffToMin = Math.abs(ctrl.selected_cluster.meta_data.rating_avg - ctrl.minRating);
      diffToAvg = Math.abs(ctrl.selected_cluster.meta_data.rating_avg - ctrl.avgRating);
      diffToMax = Math.abs(ctrl.selected_cluster.meta_data.rating_avg - ctrl.maxRating);

      if (diffToMin < diffToAvg && diffToMin < diffToMax) {
        ctrl.score_mapping.rating_score = 'Baixa';
      } else if (diffToAvg <= diffToMax) {
        ctrl.score_mapping.rating_score = 'Média';
      } else {
        ctrl.score_mapping.rating_score = 'Alta';
      }

      diffToMin = Math.abs(ctrl.selected_cluster.meta_data.morning_checkin_count_avg - ctrl.minMorningCheckinCount);
      diffToAvg = Math.abs(ctrl.selected_cluster.meta_data.morning_checkin_count_avg - ctrl.avgMorningCheckinCount);
      diffToMax = Math.abs(ctrl.selected_cluster.meta_data.morning_checkin_count_avg - ctrl.maxMorningCheckinCount);

      if (diffToMin < diffToAvg && diffToMin < diffToMax) {
        ctrl.score_mapping.morning_checkin_score = 'Baixa';
      } else if (diffToAvg <= diffToMax) {
        ctrl.score_mapping.morning_checkin_score = 'Média';
      } else {
        ctrl.score_mapping.morning_checkin_score = 'Alta';
      }

      diffToMin = Math.abs(ctrl.selected_cluster.meta_data.dawn_checkin_count_avg - ctrl.minDawnCheckinCount);
      diffToAvg = Math.abs(ctrl.selected_cluster.meta_data.dawn_checkin_count_avg - ctrl.avgDawnCheckinCount);
      diffToMax = Math.abs(ctrl.selected_cluster.meta_data.dawn_checkin_count_avg - ctrl.maxDawnCheckinCount);

      if (diffToMin < diffToAvg && diffToMin < diffToMax) {
        ctrl.score_mapping.dawn_checkin_score = 'Baixa';
      } else if (diffToAvg <= diffToMax) {
        ctrl.score_mapping.dawn_checkin_score = 'Média';
      } else {
        ctrl.score_mapping.dawn_checkin_score = 'Alta';
      }

      diffToMin = Math.abs(ctrl.selected_cluster.meta_data.afternoon_checkin_count_avg - ctrl.minAfternoonCheckinCount);
      diffToAvg = Math.abs(ctrl.selected_cluster.meta_data.afternoon_checkin_count_avg - ctrl.avgAfternoonCheckinCount);
      diffToMax = Math.abs(ctrl.selected_cluster.meta_data.afternoon_checkin_count_avg - ctrl.maxAfternoonCheckinCount);

      if (diffToMin < diffToAvg && diffToMin < diffToMax) {
        ctrl.score_mapping.afternoon_checkin_score = 'Baixa';
      } else if (diffToAvg <= diffToMax) {
        ctrl.score_mapping.afternoon_checkin_score = 'Média';
      } else {
        ctrl.score_mapping.afternoon_checkin_score = 'Alta';
      }

      diffToMin = Math.abs(ctrl.selected_cluster.meta_data.evening_checkin_count_avg - ctrl.minEveningCheckinCount);
      diffToAvg = Math.abs(ctrl.selected_cluster.meta_data.evening_checkin_count_avg - ctrl.avgEveningCheckinCount);
      diffToMax = Math.abs(ctrl.selected_cluster.meta_data.evening_checkin_count_avg - ctrl.maxEveningCheckinCount);

      if (diffToMin < diffToAvg && diffToMin < diffToMax) {
        ctrl.score_mapping.evening_checkin_score = 'Baixa';
      } else if (diffToAvg <= diffToMax) {
        ctrl.score_mapping.evening_checkin_score = 'Média';
      } else {
        ctrl.score_mapping.evening_checkin_score = 'Alta';
      }

      diffToMin = Math.abs(ctrl.selected_cluster.meta_data.comment_count_avg - ctrl.minCommentCount);
      diffToAvg = Math.abs(ctrl.selected_cluster.meta_data.comment_count_avg - ctrl.avgCommentCount);
      diffToMax = Math.abs(ctrl.selected_cluster.meta_data.comment_count_avg - ctrl.maxCommentCount);

      if (diffToMin < diffToAvg && diffToMin < diffToMax) {
        ctrl.score_mapping.comment_score = 'Baixa';
      } else if (diffToAvg <= diffToMax) {
        ctrl.score_mapping.comment_score = 'Média';
      } else {
        ctrl.score_mapping.comment_score = 'Alta';
      }

      diffToMin = Math.abs(ctrl.selected_cluster.meta_data.unique_users_count_avg - ctrl.minUniqueUserCount);
      diffToAvg = Math.abs(ctrl.selected_cluster.meta_data.unique_users_count_avg - ctrl.avgUniqueUserCount);
      diffToMax = Math.abs(ctrl.selected_cluster.meta_data.unique_users_count_avg - ctrl.maxUniqueUserCount);

      if (diffToMin < diffToAvg && diffToMin < diffToMax) {
        ctrl.score_mapping.unique_user_score = 'Baixa';
      } else if (diffToAvg <= diffToMax) {
        ctrl.score_mapping.unique_user_score = 'Média';
      } else {
        ctrl.score_mapping.unique_user_score = 'Alta';
      }

      diffToMin = Math.abs(ctrl.selected_cluster.meta_data.like_count_avg - ctrl.minLikeCount);
      diffToAvg = Math.abs(ctrl.selected_cluster.meta_data.like_count_avg - ctrl.avgLikeCount);
      diffToMax = Math.abs(ctrl.selected_cluster.meta_data.like_count_avg - ctrl.maxLikeCount);

      if (diffToMin < diffToAvg && diffToMin < diffToMax) {
        ctrl.score_mapping.like_score = 'Baixa';
      } else if (diffToAvg <= diffToMax) {
        ctrl.score_mapping.like_score = 'Média';
      } else {
        ctrl.score_mapping.like_score = 'Alta';
      }

      /*ctrl.cluster_polygon_array = [
        [ctrl.cluster_to_polygon_arrays[cluster_id]['max_lat'], ctrl.cluster_to_polygon_arrays[cluster_id]['min_lon']],
        [ctrl.cluster_to_polygon_arrays[cluster_id]['min_lat'], ctrl.cluster_to_polygon_arrays[cluster_id]['min_lon']],
        [ctrl.cluster_to_polygon_arrays[cluster_id]['min_lat'], ctrl.cluster_to_polygon_arrays[cluster_id]['max_lon']],
        [ctrl.cluster_to_polygon_arrays[cluster_id]['max_lat'], ctrl.cluster_to_polygon_arrays[cluster_id]['max_lon']]
      ]*/
    }
  }

  refreshClusters = function(algorithm) {
    var self = this;
    this.selected_algorithm = algorithm
    console.log(this.selected_algorithm)
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

      this.minReviewCount = 99999;
      this.maxReviewCount = 0;
      this.minCheckinCount = 99999;
      this.maxCheckinCount = 0;
      this.minTotalRating = 99999;
      this.maxTotalRating = 0;
      this.minRating = 99999;
      this.maxRating = 0;
      this.minMorningCheckinCount = 99999;
      this.maxMorningCheckinCount = 0;
      this.minDawnCheckinCount = 99999;
      this.maxDawnCheckinCount = 0;
      this.minAfternoonCheckinCount = 99999;
      this.maxAfternoonCheckinCount = 0;
      this.minEveningCheckinCount = 99999;
      this.maxEveningCheckinCount = 0;
      this.minCommentCount = 99999;
      this.maxCommentCount = 0;
      this.minUniqueUserCount = 99999;
      this.maxUniqueUserCount = 0;
      this.minLikeCount = 99999;
      this.maxLikeCount = 0;

      angular.forEach(this.clusters, function(cluster, key) {
          angular.forEach(cluster.insta_place_ids, function(venue_id, key) {
            this.venue_to_cluster_mapping[venue_id] = cluster.cluster_id
        }, this);

          this.cluster_id_to_cluster_mapping[cluster.cluster_id] = cluster
          switch (cluster.cluster_id % 16) {
            case 0:
              //this.cluster_to_icon_mapping[cluster.cluster_id] = {icon: {path: google.maps.SymbolPath.CIRCLE, scale: 3, strokeColor:'#660066', strokeOpacity:0.8, strokeWeight:2, fillColor: '#660066', fillOpacity:0.35}}
              this.cluster_to_icon_mapping[cluster.cluster_id] = {icon: {path: google.maps.SymbolPath.CIRCLE, scale: 3, strokeColor:'#660066', fillColor: '#660066'}}
              break;
            case 1:
              this.cluster_to_icon_mapping[cluster.cluster_id] = {icon: {path: google.maps.SymbolPath.CIRCLE, scale: 3, strokeColor:'#00FF00', fillColor: '#00FF00'}}
              break;
            case 2:
              this.cluster_to_icon_mapping[cluster.cluster_id] = {icon: {path: google.maps.SymbolPath.CIRCLE, scale: 3, strokeColor:'#0000FF', fillColor: '#0000FF'}}
              break;
            case 3:
              this.cluster_to_icon_mapping[cluster.cluster_id] = {icon: {path: google.maps.SymbolPath.CIRCLE, scale: 3, strokeColor:'#87CEFA', fillColor: '#87CEFA'}}
              break;
            case 4:
              this.cluster_to_icon_mapping[cluster.cluster_id] = {icon: {path: google.maps.SymbolPath.CIRCLE, scale: 3, strokeColor:'#EE82EE', fillColor: '#EE82EE'}}
              break;
            case 5:
              this.cluster_to_icon_mapping[cluster.cluster_id] = {icon: {path: google.maps.SymbolPath.CIRCLE, scale: 3, strokeColor:'#FF0000', fillColor: '#FF0000'}}
              break;
            case 6:
              this.cluster_to_icon_mapping[cluster.cluster_id] = {icon: {path: google.maps.SymbolPath.CIRCLE, scale: 3, strokeColor:'#FFFF00', fillColor: '#FFFF00'}}
              break;
            case 7:
              this.cluster_to_icon_mapping[cluster.cluster_id] = {icon: {path: google.maps.SymbolPath.CIRCLE, scale: 3, strokeColor:'#006400', fillColor: '#006400'}}
              break;
            case 8:
              this.cluster_to_icon_mapping[cluster.cluster_id] = {icon: {path: google.maps.SymbolPath.CIRCLE, scale: 3, strokeColor:'#330000', fillColor: '#330000'}}
              break;
            case 9:
              this.cluster_to_icon_mapping[cluster.cluster_id] = {icon: {path: google.maps.SymbolPath.CIRCLE, scale: 3, strokeColor:'#66FF66', fillColor: '#66FF66'}}
              break;
            case 10:
              this.cluster_to_icon_mapping[cluster.cluster_id] = {icon: {path: google.maps.SymbolPath.CIRCLE, scale: 3, strokeColor:'#999900', fillColor: '#999900'}}
              break;
            case 11:
              this.cluster_to_icon_mapping[cluster.cluster_id] = {icon: {path: google.maps.SymbolPath.CIRCLE, scale: 3, strokeColor:'#000066', fillColor: '#000066'}}
              break;
            case 12:
              this.cluster_to_icon_mapping[cluster.cluster_id] = {icon: {path: google.maps.SymbolPath.CIRCLE, scale: 3, strokeColor:'#E0E0E0', fillColor: '#E0E0E0'}}
              break;
            case 13:
              this.cluster_to_icon_mapping[cluster.cluster_id] = {icon: {path: google.maps.SymbolPath.CIRCLE, scale: 3, strokeColor:'#FF8000', fillColor: '#FF8000'}}
              break;
            case 14:
              this.cluster_to_icon_mapping[cluster.cluster_id] = {icon: {path: google.maps.SymbolPath.CIRCLE, scale: 3, strokeColor:'#99004C', fillColor: '#99004C'}}
              break;
            case 15:
              this.cluster_to_icon_mapping[cluster.cluster_id] = {icon: {path: google.maps.SymbolPath.CIRCLE, scale: 3, strokeColor:'#009999', fillColor: '#009999'}}
              break;
          }

          if (cluster.meta_data.review_count_avg >= this.maxReviewCount) {
            this.maxReviewCount = cluster.meta_data.review_count_avg;
          }

          if (cluster.meta_data.review_count_avg <= this.minReviewCount){
            this.minReviewCount = cluster.meta_data.review_count_avg;
          }

          if (cluster.meta_data.checkin_count_avg >= this.maxCheckinCount) {
            this.maxCheckinCount = cluster.meta_data.checkin_count_avg;
          }

          if (cluster.meta_data.checkin_count_avg <= this.minCheckinCount){
            this.minCheckinCount = cluster.meta_data.checkin_count_avg;
          }

          if (cluster.meta_data.total_rating_avg >= this.maxTotalRating) {
            this.maxTotalRating = cluster.meta_data.total_rating_avg;
          }

          if (cluster.meta_data.total_rating_avg <= this.minTotalRating){
            this.minTotalRating = cluster.meta_data.total_rating_avg;
          }

          if (cluster.meta_data.rating_avg >= this.maxRating) {
            this.maxRating = cluster.meta_data.rating_avg;
          }

          if (cluster.meta_data.rating_avg <= this.minRating){
            this.minRating = cluster.meta_data.rating_avg;
          }

          if (cluster.meta_data.morning_checkin_count_avg >= this.maxMorningCheckinCount) {
            this.maxMorningCheckinCount = cluster.meta_data.morning_checkin_count_avg;
          }

          if (cluster.meta_data.morning_checkin_count_avg <= this.minMorningCheckinCount){
            this.minMorningCheckinCount = cluster.meta_data.morning_checkin_count_avg;
          }

          if (cluster.meta_data.dawn_checkin_count_avg >= this.maxDawnCheckinCount) {
            this.maxDawnCheckinCount = cluster.meta_data.dawn_checkin_count_avg;
          }

          if (cluster.meta_data.dawn_checkin_count_avg <= this.minDawnCheckinCount){
            this.minDawnCheckinCount = cluster.meta_data.dawn_checkin_count_avg;
          }

          if (cluster.meta_data.afternoon_checkin_count_avg >= this.maxAfternoonCheckinCount) {
            this.maxAfternoonCheckinCount = cluster.meta_data.afternoon_checkin_count_avg;
          }

          if (cluster.meta_data.afternoon_checkin_count_avg <= this.minAfternoonCheckinCount){
            this.minAfternoonCheckinCount = cluster.meta_data.afternoon_checkin_count_avg;
          }

          if (cluster.meta_data.evening_checkin_count_avg >= this.maxEveningCheckinCount) {
            this.maxEveningCheckinCount = cluster.meta_data.evening_checkin_count_avg;
          }

          if (cluster.meta_data.evening_checkin_count_avg <= this.minEveningCheckinCount){
            this.minEveningCheckinCount = cluster.meta_data.evening_checkin_count_avg;
          }

          if (cluster.meta_data.comment_count_avg >= this.maxCommentCount) {
            this.maxCommentCount = cluster.meta_data.comment_count_avg;
          }

          if (cluster.meta_data.comment_count_avg <= this.minCommentCount){
            this.minCommentCount = cluster.meta_data.comment_count_avg;
          }

          if (cluster.meta_data.unique_users_count_avg >= this.maxUniqueUserCount) {
            this.maxUniqueUserCount = cluster.meta_data.unique_users_count_avg;
          }

          if (cluster.meta_data.unique_users_count_avg <= this.minUniqueUserCount){
            this.minUniqueUserCount = cluster.meta_data.unique_users_count_avg;
          }

          if (cluster.meta_data.like_count_avg >= this.maxLikeCount) {
            this.maxLikeCount = cluster.meta_data.like_count_avg;
          }

          if (cluster.meta_data.like_count_avg <= this.minLikeCount){
            this.minLikeCount = cluster.meta_data.like_count_avg;
          }
      }, this);

      this.avgReviewCount = (this.maxReviewCount + this.minReviewCount) / 2;
      this.avgCheckinCount = (this.maxCheckinCount + this.minCheckinCount) / 2;
      this.avgTotalRating = (this.maxTotalRating + this.minTotalRating) / 2;
      this.avgRating = (this.maxRating + this.minRating) / 2;
      this.avgMorningCheckinCount = (this.maxMorningCheckinCount + this.minMorningCheckinCount) / 2;
      this.avgDawnCheckinCount = (this.maxDawnCheckinCount + this.minDawnCheckinCount) / 2;
      this.avgAfternoonCheckinCount = (this.maxAfternoonCheckinCount + this.minAfternoonCheckinCount) / 2;
      this.avgEveningCheckinCount = (this.maxEveningCheckinCount + this.minEveningCheckinCount) / 2;
      this.avgCommentCount = (this.maxCommentCount + this.minCommentCount) / 2;
      this.avgUniqueUserCount = (this.maxUniqueUserCount + this.minUniqueUserCount) / 2;
      this.avgLikeCount = (this.maxLikeCount + this.minLikeCount) / 2;

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
        }, this);

        self.$timeout(function () {
            console.log("finished");
            self.is_loaded = true;
        }, 3000);
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

      this.NgMap.getMap("map").then(function (map) {
        map.setZoom(13);
        map.panTo(new google.maps.LatLng(ctrl.selected_neighborhood.coordinates[0][0], ctrl.selected_neighborhood.coordinates[0][1]));
      });


      /*ctrl.cluster_polygon_array = [
        [ctrl.cluster_to_polygon_arrays[cluster_id]['max_lat'], ctrl.cluster_to_polygon_arrays[cluster_id]['min_lon']],
        [ctrl.cluster_to_polygon_arrays[cluster_id]['min_lat'], ctrl.cluster_to_polygon_arrays[cluster_id]['min_lon']],
        [ctrl.cluster_to_polygon_arrays[cluster_id]['min_lat'], ctrl.cluster_to_polygon_arrays[cluster_id]['max_lon']],
        [ctrl.cluster_to_polygon_arrays[cluster_id]['max_lat'], ctrl.cluster_to_polygon_arrays[cluster_id]['max_lon']]
      ]*/
    }
  }

  toggleSidebar = function(ctrl) {
    ctrl.sidebar_active = ctrl.sidebar_active ? false : true;
    console.log(ctrl.sidebar_active);
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
