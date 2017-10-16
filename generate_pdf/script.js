

(function(){
    
    var ImageFactory = function(context) {

      this.context = context; //get the context of the canvas

      /*Function to temporarily draw the image of the map on a canvas on index.html before generating its pdf*/
      this.drawImage = function(canvas, image_arg, image_x, image_y, image_w, image_h) {

        var _this = this;
        var image = new Image();
        image.setAttribute('crossOrigin', 'anonymous');
        image.src = image_arg;

        image.onload = function() {

          _this.context.drawImage(image, image_x, image_y, image_w, image_h); //Draw the image of the map on the canvas as soon as its done loading
          
          var imgData = canvas.toDataURL("image/jpeg", 1.0); 
          var pdf = new jsPDF();
          pdf.addImage(imgData, 'JPEG', 0, 0); //Add the canvas data to the pdf generator
          pdf.save("map.pdf"); //Download the pdf

          canvas.width = 0;
          canvas.height = 0;
          context.clearRect(0, 0, canvas.width, canvas.height); //Clear the canvas

        };
      };
    };

    /*Function to get tiles data from geometry of the currently viewed Plan*/
    function getTilesFromGeometry(geometry, template, zoom){
      
      function long2tile(lon,zoom) {
        return (Math.floor((lon+180)/360*Math.pow(2,zoom)));
      }
      
      function lat2tile(lat,zoom) {
        return (Math.floor((1-Math.log(Math.tan(lat*Math.PI/180) + 1/Math.cos(lat*Math.PI/180))/Math.PI)/2 *Math.pow(2,zoom)));
      }
      
      function replaceInTemplate(point){
        return template.replace('{z}', point.z)
          .replace('{x}', point.x)
          .replace('{y}', point.y);
      }

      var allLat = geometry.map(function(point){
        return point.lat;
      });
      var allLng = geometry.map(function(point){
        return point.lng;
      });
      
      var minLat = Math.min.apply(null, allLat);
      var maxLat = Math.max.apply(null, allLat);
      var minLng = Math.min.apply(null, allLng);
      var maxLng = Math.max.apply(null, allLng);
      var top_tile    = lat2tile(maxLat, zoom);
      var left_tile   = long2tile(minLng, zoom);
      var bottom_tile = lat2tile(minLat, zoom);
      var right_tile  = long2tile(maxLng, zoom);

      var tiles = [];
      //Collecting all tiles
      for (var y = top_tile; y < bottom_tile + 1; y++) {
        for (var x = left_tile; x < right_tile + 1; x++) {
          tiles.push(replaceInTemplate({x, y, z: zoom}))
        }
      }

      return tiles;

    } 

    /*'On Click' listener of the pdf generate button*/
    download.addEventListener("click", function() {
  
      var canvas = document.createElement('canvas'); //Create a canvas to temporarily render the map
      /*Set properties of canvas*/
      canvas.id = "myCanvas";
      canvas.width = 512;
      canvas.height = 512;
      canvas.style.position = "absolute";
      canvas.style.border = "1px solid";
      var body = document.getElementsByTagName("body")[0];
      body.appendChild(canvas); //Append canvas to the body of the html page
      
      new DroneDeploy({version: 1}).then(function(dronedeploy){

        dronedeploy.Plans.getCurrentlyViewed().then(function(plan){ //Get Plan which is currently viewed

          var zoom = 16; //Set zoom level 

          dronedeploy.Tiles.get({planId: plan.id, layerName: 'ortho', zoom: zoom}) //Get tiles of the fetched Plan
          .then(function(res){
            tiles = getTilesFromGeometry(plan.geometry, res.template, zoom);
            tiles.map((tileUrl) => {
              
              var context = canvas.getContext('2d');
              var imageFactory = new ImageFactory(context);
              imageFactory.drawImage(canvas, tileUrl, 0, 0, 256, 256); //Call drawImage, which draws the map on the canvas before generating its pdf

            });
          });
        });
      });
    });

})();

