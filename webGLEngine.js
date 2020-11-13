"use strict";

function eachItem(items, callback, done, beginIndex) {
  beginIndex = beginIndex || 0;
  var _eachItem = {
    arr: items,
    index: beginIndex,
    invoke: callback,
    done: done,
    callNext: function () {
      if (this.index < this.arr.length) {
        this.index++;
        this.invoke(this.arr[this.index - 1], this);

      } else {

        if (this.done) this.done();
      }
    }
  };
  _eachItem.call = _eachItem.callNext;
  _eachItem.callNext();

};

function loadUrl(e, t) {
  t = t || "text", console.log("loading url", e);
  var i = new XMLHttpRequest;
  return i.responseType = t,
    i.open("GET", e, !0),
    i.onload = function (e) { }, i.send(),
    i.onerror = function (e) {
      console.log("error", e);
    }, i
};



function guidInteger() {
  guidInteger.counter++;
  return (Date.now() + guidInteger.counter);
}

guidInteger.counter = 0;

/* extend object prototype  */
function extend(subclass, superclass) {
  function Dummy() { }
  Dummy.prototype = superclass.prototype;
  subclass.prototype = new Dummy();
  subclass.prototype.constructor = subclass;
  subclass.superclass = superclass;
  subclass.superproto = superclass.prototype;
};



/* Minimal 3d webgl engine with webvr and webaudio support */

document.exitPointerLock = document.exitPointerLock || document.mozExitPointerLock;
function webGLEngine(canvasElement) {
  
  canvasElement =canvasElement || document.createElement('canvas');
  var options = {};
  var gl = canvasElement.getContext("webgl", options) || canvasElement.getContext('experimental-webgl', options);
  console.log("gl", gl);
  gl.canvasElement = canvasElement;

  gl.canvasElement.requestPointerLock = gl.canvasElement.requestPointerLock || gl.canvasElement.mozRequestPointerLock;


  gl.OnClick = function () { };

  gl.canvasElement.addEventListener("click", function () {
    gl.OnClick();
  }, false);
  gl.OnAfterResize = function () {};

  gl.clearScreen = function () { this.clear(this.COLOR_BUFFER_BIT | this.DEPTH_BUFFER_BIT); return this; };

  gl.enable(gl.DEPTH_TEST);
 
  
  gl.DEG_TO_RAD_HELP = 0.017453292519943295;
  gl._360DEGRAD = 360 * gl.DEG_TO_RAD_HELP;
  gl._1DEGRAD = 1 * gl.DEG_TO_RAD_HELP;
  gl.RAD_TO_DEG_HELP = 57.295779513082323;

  gl.ATTRIBUTES_SUPPORT = {
    VERTICES: 2,
    NORMALS: 4,
    UVS: 8,
    COLORS: 16
  };

  gl.shaderCounter = 0;

  gl.lastShader = -1;
  gl.shaderSwitching = 0;

  gl.globals = {}, gl.globals_values_timestamps = {};
  gl.global_uniforms = {
    set: function (key, value) {
      if (!this.items[key]) {
        this.items[key] = { value: value, timestamp: gl.currentTimer, shaderCounter: 0 };
      } else {
        this.items[key].value = value;
        this.items[key].timestamp = gl.currentTimer;
      }

    },
    reset: function () {
      for (gl._index in this.items) {
        this.items[gl._index].timestamp = -1;
        this.items[gl._index].shaderCounter = 0;
      }
    },
    info: function () {
      var s = "";
      for (gl._index in this.items) {
        s += gl._index + "=" + this.items[gl._index].shaderCounter + '<br/>';
      }
      return (s);
    },
    items: {}
  };

  gl.globalUniforms = gl.global_uniforms;



  gl.globalUniformStatus = function () {
    return (gl.global_uniforms.info());
  };
  gl._index = 0,
  gl._item = null, gl._att = null, gl._uni = null, gl._guni = null;

  /* use shader and keep track of shader switching , it requires more handling for optimizations */
  gl.useShader = function (shader, updateGlobalUniforms) {
    if (gl.lastShader != shader.uuid) {
      gl.shaderSwitching++;
      gl.useProgram(shader.program);
      updateGlobalUniforms = true;
      gl.lastShader = shader.uuid;
    }
    if (updateGlobalUniforms) {
      for (gl._index = 0 ; gl._index < shader._globalUniforms.length; gl._index++) {
        gl._uni = shader._globalUniforms[gl._index];
        gl._guni = gl.global_uniforms.items[gl._uni.name];

        if (gl._guni.timestamp != gl._uni.timestamp) {
         
        }
        gl._uni.timestamp = gl._guni.timestamp;
        gl._guni.shaderCounter++;
        gl._uni.params[gl._uni.params.length - 1] = gl._guni.value;
        gl._uni.func.apply(gl, gl._uni.params);

      }
    }
  };

  gl.clearShader = function () {
    gl.lastShader = -1
    gl.useProgram(null);
    gl.global_uniforms.reset();
  };

  gl.Textures = {};
  gl.UpdateTexture = function (name, img, noMips) {
   

    var tex = this.Textures[name];


    this.bindTexture(this.TEXTURE_2D, tex);														//Set text buffer for work
    this.texImage2D(this.TEXTURE_2D, 0, this.RGBA, this.RGBA, this.UNSIGNED_BYTE, img);			//Push image to GPU.

    if (noMips === undefined || noMips == false) {
      this.texParameteri(this.TEXTURE_2D, this.TEXTURE_MAG_FILTER, this.LINEAR);					//Setup up scaling
      this.texParameteri(this.TEXTURE_2D, this.TEXTURE_MIN_FILTER, this.LINEAR_MIPMAP_NEAREST);	//Setup down scaling
      this.generateMipmap(this.TEXTURE_2D);	//Precalc different sizes of texture for better quality rendering.
    } else {
      this.texParameteri(this.TEXTURE_2D, this.TEXTURE_MAG_FILTER, this.NEAREST);
      this.texParameteri(this.TEXTURE_2D, this.TEXTURE_MIN_FILTER, this.NEAREST);
      this.texParameteri(this.TEXTURE_2D, this.TEXTURE_WRAP_S, this.CLAMP_TO_EDGE);
      this.texParameteri(this.TEXTURE_2D, this.TEXTURE_WRAP_T, this.CLAMP_TO_EDGE);
    }

    this.bindTexture(this.TEXTURE_2D, null);									//Unbind


    return tex;
  }
  gl.LoadTexture = function (name, img, noMips) {
    this.Textures[name] = this.createTexture();
    return this.UpdateTexture(name, img, noMips);
  };
  

  /* Shaders handling  */
  (function (gl) {

   gl.Shader = function (vs, fs) {
     var vShader = gl.Shader.createShader(vs, gl.VERTEX_SHADER);
     if (!vShader) return null;
     var fShader = gl.Shader.createShader(fs, gl.FRAGMENT_SHADER);
     if (!fShader) { gl.deleteShader(vShader); return null; }
     this.program = gl.Shader.createProgram(vShader, fShader, true);


     gl.useProgram(this.program);

     var self = this;
     this.attributes = {};
     this._attributes = [];
     var attributeTokens = vs.replace(/  /g, " ").match(/attribute[\s\S]*?;/ig);
     if (attributeTokens) {
       attributeTokens.forEach(function (att) {
         att = att.replace("attribute", "").replace(";", "").trim().split(" ");
         if (att.length > 1) {
           att = { shaderType: att[0], name: att[1], location: gl.getAttribLocation(self.program, att[1]) };

           self.attributes[att.name] = att;
           self._attributes.push(att);
         }
       });
     }


     this.uniforms = {};
     this._uniforms = [];
     this._globalUniforms = [];
     this.uuid = guidInteger();
     var searchUniforms = function (uniformTokens) {
       if (uniformTokens) {
         uniformTokens.forEach(function (uni) {
           uni = uni.replace("uniform", "").replace(";", "").trim().split(" ");
           if (uni.length > 1) {
             uni = { shaderType: uni[0], name: uni[1], timestamp: 0 };
             uni.location = gl.getUniformLocation(self.program, uni.name);
             uni.isGlobal = uni.name.indexOf("gb_") == 0;
             uni.func = gl.Shader.typeFunc[uni.shaderType];
             self.uniforms[uni.name] = uni;
             uni.params = [uni.location, 0];
             if (uni.func.length === 3)
               uni.params = [uni.location, false, 0];
             else if (uni.func.length === 2) {
               uni.params = [uni.location, 0];
             }
             if (uni.isGlobal) {

               self._globalUniforms.push(uni);
             }
             else self._uniforms.push(uni);

             uni.set = function (v) {
               this.params[this.params.length - 1] = v;
               this.func.apply(gl, this.params);
             };

           }
         });
       }
     };
     searchUniforms(vs.replace(/  /g, " ").match(/uniform[\s\S]*?;/ig));
     searchUniforms(fs.replace(/  /g, " ").match(/uniform[\s\S]*?;/ig));

     gl.useProgram(null);
     return (this);
   };

   gl.Shader.createShader = function (src, type) {
     var shader = gl.createShader(type);
     gl.shaderSource(shader, src);
     gl.compileShader(shader);

     if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
       console.error("Error compiling shader : " + src, gl.getShaderInfoLog(shader));
       gl.deleteShader(shader);
       return null;
     }

     return shader;
   };
   gl.Shader.createProgram = function (vShader, fShader, doValidate) {
     //Link shaders together
     var prog = gl.createProgram();
     gl.attachShader(prog, vShader);
     gl.attachShader(prog, fShader);

     gl.linkProgram(prog);

     //Check if successful
     if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
       console.error("Error creating shader program.", gl.getProgramInfoLog(prog));
       gl.deleteProgram(prog); return null;
     }

     //Only do this for additional debugging.
     if (doValidate) {
       gl.validateProgram(prog);
       if (!gl.getProgramParameter(prog, gl.VALIDATE_STATUS)) {
         console.error("Error validating program", gl.getProgramInfoLog(prog));
         gl.deleteProgram(prog); return null;
       }
     }

     //Can delete the shaders since the program has been made.
     gl.detachShader(prog, vShader); //TODO, detaching might cause issues on some browsers, Might only need to delete.
     gl.detachShader(prog, fShader);
     gl.deleteShader(fShader);
     gl.deleteShader(vShader);

     return prog;
   };

   gl.Shader.typeFunc = {
     "float": gl.uniform1f,
     "vec2": gl.uniform2f,
     "vec3": gl.uniform3fv,
     "vec4": gl.uniform4fv,

     "mat2": gl.uniformMatrix2fv,
     "mat3": gl.uniformMatrix3fv,
     "mat4": gl.uniformMatrix4fv,

     "int": gl.uniform1i,
     "ivec2": gl.uniform2i,
     "ivec3": gl.uniform3i,
     "ivec4": gl.uniform4i,

     "sampler2D": gl.uniform1i,

     "samplerCube": gl.uniform1i,


   };

 



  })(gl);


  /* Geometries */
  (function (gl) {
      gl.Geometry = function (info) {
        info = info || { buffers: [] };


        info.buffers.forEach(function (buff) {
          buff.dest = gl.createBuffer();

          if (buff.isIndexBuffer ) {
            gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, buff.dest);
            gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, buff.data, gl.DYNAMIC_DRAW);

          }
          else  {
            gl.bindBuffer(gl.ARRAY_BUFFER, buff.dest);
            gl.bufferData(gl.ARRAY_BUFFER, buff.data, gl.STATIC_DRAW);
            if (!info.numitems) info.numItems = buff.data.length / buff.itemSize;
          }


        });

        this.info = info;

        this.drawFunc = gl.drawArrays;
        this.drawParams = [info.drawType, 0, info.numItems];

        return (this);
      };

      gl.Geometry.CalculateNormalArray = function (vertices, indices) {
        var vertexVectors = [];
        var normalVectors = [];
        var normals = [];
        for (var i = 0; i < vertices.length; i = i + 3) {
          var vector = vec3.fromValues (vertices[i], vertices[i + 1], vertices[i + 2]);
          var normal = vec3.create(); 
          normalVectors.push(normal);
          vertexVectors.push(vector);
        }

        for (var j = 0; j < indices.length; j = j + 3)
        {
          //v1-v0 
          var vector1 = vec3.create();
          var vector2 = vec3.create();

          vec3.subtract(vector1, vertexVectors[indices[j + 1]], vertexVectors[indices[j]]);

          vec3.subtract(vector2, vertexVectors[indices[j + 2]], vertexVectors[indices[j + 1]]);

       


          var normal = vec3.create();

          //cross-product of two vectors
          

          vec3.cross(normal,vector1, vector2);

          //Since the normal caculated from three vertices is the same for all 
          // the three vertices(same face/surface), the contribution from each 
          // normal to the corresponding vertex  is the same 
          
         
          vec3.add(normalVectors[indices[j]], normalVectors[indices[j]], normal);

          vec3.add(normalVectors[indices[j + 1]], normalVectors[indices[j + 1]], normal);

          vec3.add(normalVectors[indices[j + 2]], normalVectors[indices[j + 2]], normal);






        }

        for (var j = 0; j < normalVectors.length; j = j + 1) {
          vec2.normalize(normalVectors[j], normalVectors[j])
        

          normals.push(normalVectors[j][0], normalVectors[j][1], normalVectors[j][2]);

        }

        return (normals);
      };


      gl.Geometry.prototype.draw = function () {
        this.drawFunc.apply(gl, this.drawParams);
      };

      gl.Geometry.Quad = function () {

        var g = new gl.Geometry({
          attributeSupport: gl.ATTRIBUTES_SUPPORT.VERTICES | gl.ATTRIBUTES_SUPPORT.UVS | gl.ATTRIBUTES_SUPPORT.NORMALS,
          buffers: [
               {
                 attribute: "a_position",
                 data: new Float32Array([1, -1, 0, 1, 1, 0, -1, -1, 0, 1, 1, 0, -1, 1, 0, -1, -1, 0]),
                 itemSize: 3,
               },
                {
                  attribute: "a_normal",
                  data: new Float32Array([0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1]),
                  itemSize: 3,
                },
              {
                attribute: "a_uv",
                data: new Float32Array([0, 1, 0, 0, 1, 1, 0, 0, 0, 1, 1, 1]),
                itemSize: 2,
              }
          ],
          drawType: gl.TRIANGLES
        });

        return (g);
      };

      gl.Geometry.Cube1 = function () {
       
        var positions = [  // Front face
            -0.1, -0.1, 0.1,
             0.1, -0.1, 0.1,
             0.1, 0.1, 0.1,
            -0.1, 0.1, 0.1,

            // Back face
            -0.1, -0.1, -0.1,
            -0.1, 0.1, -0.1,
             0.1, 0.1, -0.1,
             0.1, -0.1, -0.1,

            // Top face
            -0.1, 0.1, -0.1,
            -0.1, 0.1, 0.1,
             0.1, 0.1, 0.1,
             0.1, 0.1, -0.1,

            // Bottom face
            -0.1, -0.1, -0.1,
             0.1, -0.1, -0.1,
             0.1, -0.1, 0.1,
            -0.1, -0.1, 0.1,

            // Right face
             0.1, -0.1, -0.1,
             0.1, 0.1, -0.1,
             0.1, 0.1, 0.1,
             0.1, -0.1, 0.1,

            // Left face
            -0.1, -0.1, -0.1,
            -0.1, -0.1, 0.1,
            -0.1, 0.1, 0.1,
            -0.1, 0.1, -0.1];

        var indices = [0, 1, 2, 0, 2, 3,
	4, 5, 6, 4, 6, 7,
	8, 9, 10, 8, 10, 11,
	12, 13, 14, 12, 14, 15,
	16, 17, 18, 16, 18, 19,
	20, 21, 22, 20, 22, 23];
        var uvs = [// Front face
          0.0, 0.0,
          1.0, 0.0,
          1.0, 1.0,
          0.0, 1.0,

          // Back face
          1.0, 0.0,
          1.0, 1.0,
          0.0, 1.0,
          0.0, 0.0,

          // Top face
          0.0, 1.0,
          0.0, 0.0,
          1.0, 0.0,
          1.0, 1.0,

          // Bottom face
          1.0, 1.0,
          0.0, 1.0,
          0.0, 0.0,
          1.0, 0.0,

          // Right face
          1.0, 0.0,
          1.0, 1.0,
          0.0, 1.0,
          0.0, 0.0,

          // Left face
          0.0, 0.0,
          1.0, 0.0,
          1.0, 1.0,
          0.0, 1.0, ];
        var normals = gl.Geometry.CalculateNormalArray(positions, indices);

        normals = [  // Front face
            0.0, 0.0, 1.0,
            0.0, 0.0, 1.0,
            0.0, 0.0, 1.0,
            0.0, 0.0, 1.0,

            // Back face

            0.0, 0.0, -1.0,
            0.0, 0.0, -1.0,
            0.0, 0.0, -1.0,
            0.0, 0.0, -1.0,

            // Top face
            0.0, 1.0, 0.0,
            0.0, 1.0, 0.0,
            0.0, 1.0, 0.0,
            0.0, 1.0, 0.0,

            // Bottom face
            0.0, -1.0, 0.0,
            0.0, -1.0, 0.0,
            0.0, -1.0, 0.0,
            0.0, -1.0, 0.0,



            // Right face
             1.0, 0.0, 0.0,
             1.0, 0.0, 0.0,
             1.0, 0.0, 0.0,
             1.0, 0.0, 0.0,

            // Left face
             -1.0, 0.0, 0.0,
             -1.0, 0.0, 0.0,
             -1.0, 0.0, 0.0,
             -1.0, 0.0, 0.0 ];

        var g = new gl.Geometry({
          attributeSupport: gl.ATTRIBUTES_SUPPORT.VERTICES | gl.ATTRIBUTES_SUPPORT.NORMALS | gl.ATTRIBUTES_SUPPORT.UVS,
          buffers: [
              { data: new Uint16Array(indices), isIndexBuffer: true },
               {
                 attribute: "a_position",
                 data: new Float32Array(positions),
                 itemSize: 3,
               },

              {
                attribute: "a_uv",
                data: new Float32Array(uvs),
                itemSize: 2,
              },
               {
                 attribute: "a_normal",
                 data: new Float32Array(normals),
                 itemSize: 3,
               }
          ],
          drawType: gl.TRIANGLES
        });
        g.draw = function () {
          gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.info.buffers[0].dest);
          gl.drawElements(gl.TRIANGLES, this.info.buffers[0].data.length, gl.UNSIGNED_SHORT, 0);
        };
        return (g);
      };


      gl.Geometry.Cube = function (side) {
        var s = (side || 1) / 2;
        var coords = [];
        var normals = [];
        var texCoords = [];
        var indices = [];
        function face(xyz, nrm) {
          var start = coords.length / 3;
          var i;
          for (i = 0; i < 12; i++) {
            coords.push(xyz[i]);
          }
          for (i = 0; i < 4; i++) {
            normals.push(nrm[0], nrm[1], nrm[2]);
          }
          texCoords.push(0, 0, 1, 0, 1, 1, 0, 1);
          indices.push(start, start + 1, start + 2, start, start + 2, start + 3);
        }
        face([-s, -s, s, s, -s, s, s, s, s, -s, s, s], [0, 0, 1]);
        face([-s, -s, -s, -s, s, -s, s, s, -s, s, -s, -s], [0, 0, -1]);
        face([-s, s, -s, -s, s, s, s, s, s, s, s, -s], [0, 1, 0]);
        face([-s, -s, -s, s, -s, -s, s, -s, s, -s, -s, s], [0, -1, 0]);
        face([s, -s, -s, s, s, -s, s, s, s, s, -s, s], [1, 0, 0]);
        face([-s, -s, -s, -s, -s, s, -s, s, s, -s, s, -s], [-1, 0, 0]);

        var g = new gl.Geometry({
          attributeSupport: gl.ATTRIBUTES_SUPPORT.VERTICES | gl.ATTRIBUTES_SUPPORT.NORMALS | gl.ATTRIBUTES_SUPPORT.UVS,
          buffers: [
              { data: new Uint16Array(indices), isIndexBuffer: true },
               {
                 attribute: "a_position",
                 data: new Float32Array(coords),
                 itemSize: 3,
               },

              {
                attribute: "a_uv",
                data: new Float32Array(texCoords),
                itemSize: 2,
              },
               {
                 attribute: "a_normal",
                 data: new Float32Array(normals),
                 itemSize: 3,
               }
          ],
          drawType: gl.TRIANGLES
        });
        g.draw = function () {
          gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.info.buffers[0].dest);
          gl.drawElements(gl.TRIANGLES, this.info.buffers[0].data.length, gl.UNSIGNED_SHORT, 0);
        };
        return (g);


      }
      gl.Geometry.waveFrontObj = function (content) {
        var obj = wavefrontObjParser(content);
       
        console.log(obj);
        var vertices = [], normals = [], uvs = [];
        obj.vertices.forEach(function (v) {
          if (v) {
            vertices.push(v[0], v[1], v[2]);
          }
         
        });



        
        if (obj.normals[0] == "undefined") {
          normals = gl.Geometry.CalculateNormalArray(vertices, obj.indices);
          console.log("new normals", normals);
        }
        else {
          obj.normals.forEach(function (v) {
            if (v) {
              normals.push(v[0], v[1], v[2]);
            }
          });
        }
        


        obj.texturecoords.forEach(function (u) {
          if (u) {
            uvs.push(u[0], u[1]);
          }
          
        });


        var g = new gl.Geometry({
          attributeSupport: gl.ATTRIBUTES_SUPPORT.VERTICES | gl.ATTRIBUTES_SUPPORT.NORMALS | gl.ATTRIBUTES_SUPPORT.UVS,
          buffers: [
             { data: new Uint16Array(obj.indices), isIndexBuffer: true },
               {
                 attribute: "a_position",
                 data: new Float32Array(vertices),
                 itemSize: 3,
               },

               {
                 attribute: "a_normal",
                 data: new Float32Array(normals),
                 itemSize: 3,
               },

              {
                attribute: "a_uv",
                data: new Float32Array(uvs),
                itemSize: 2,
              }
          ],
          drawType: gl.TRIANGLES
        });
        if (g.info.buffers[0].data.length > 0) {
          g.draw = function () {
            gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.info.buffers[0].dest);
            gl.drawElements(gl.TRIANGLES, this.info.buffers[0].data.length, gl.UNSIGNED_SHORT, 0);
          };
        }
        else {
          g.info.buffers = g.info.buffers.splice(0, 1);
        }
        console.log(g.info);
        return (g);

      };

  })(gl);

  /* Generic transform object used in 3d space  */
  (function (gl) {
      gl.Transform = function () {
        this.position = vec3.create();
        this.scale = vec3.create();
        this.rotation = quat.create();
        this.localMatrix = mat4.create();
        this.worldMatrix = mat4.create();
        this.invertWorldMatrix = mat4.create();
       
        this.scale[0] = 1; this.scale[1] = 1; this.scale[2] = 1;
        //Parent / Child Relations
        this.children = [];
        this._parent = null;

        this.visible = true;
        this.childTree = [];
        this.childTreeBegin = -1;
        this.childTreeEnd = -1;
        this.childTreeDepth = 0;
        this.uuid = guidInteger();
        this.uuidMap = this.uuid;
        return (this);
      };


      gl.Transform.prototype.setPosition = function (x, y, z) {
        this.position[0] = x;
        this.position[1] = y;
        this.position[2] = z;       
        this.position.isModified = true;

        return this;
      };
      gl.Transform.prototype.setScale = function (x, y, z) {
        this.scale[0] = x;
        this.scale[1] = y;
        this.scale[2] = z;
        this.scale.isModified = true;
        return this;
      };
      gl.Transform.prototype.setRotation = function (x, y, z) {

        quat.fromEuler(this.rotation, x, y, z);
      

        this.rotation.isModified = true;
        return this;
      };
      gl.Transform.prototype._getDirection = function (xi, yi, zi, d, v) {     

        if (d == undefined) d = 1; 
       
        v = v || vec3.create();

        var x = this.localMatrix[xi], y = this.localMatrix[yi], z = this.localMatrix[zi],
            m = Math.sqrt(x * x + y * y + z * z);

        v[0] = x / m * d;
        v[1] = y / m * d;
        v[2] = z / m * d;
        return v;
      };
      gl.Transform.prototype.left = function (v, d) { return this._getDirection(0, 1, 2, d, v); };
      gl.Transform.prototype.up = function (v, d) { return this._getDirection(4, 5, 6, d, v); };
      gl.Transform.prototype.forward = function (v, d) { return this._getDirection(8, 9, 10, d, v); };
      gl.Transform.prototype.updateMatrix = function (forceWorldUpdate) {
        var isDirty = (this.position.isModified || this.scale.isModified || this.rotation.isModified);

        if (!isDirty && !forceWorldUpdate) {

          if (this._parent != null) {
            mat4.mul(this.worldMatrix, this._parent.worldMatrix, this.localMatrix);
          }
          return false;

        }
        else if (isDirty) {
          //Update our local Matrix
          mat4.fromRotationTranslationScale(this.localMatrix, this.rotation, this.position, this.scale);



      
          //Set the modified indicator to false on all the transforms.
          this.position.isModified = false;
          this.scale.isModified = false;
          this.rotation.isModified = false;
        }

        //Figure out the world matrix.



        if (this._parent != null) {
          mat4.mul(this.worldMatrix, this._parent.worldMatrix, this.localMatrix);
          mat4.invert(this.invertWorldMatrix, this.worldMatrix);
        }
        else {

          //this.worldMatrix = this.localMatrix;
        } //if not parent, localMatrix is worldMatrix
        if (this.normalMatrix) {
         

          mat4.transpose(this.normalMatrix, this.invertWorldMatrix);
           //Matrix4.normalMat3(this.normalMatrix, this.worldMatrix);
        }
      

        return true;
      };

      gl.Transform.prototype.setParent = function (p) {
        if (this._parent != null) { this._parent.removeChild(this); }
        if (p != null) p.addChild(this);
      };

      gl.Transform.prototype.prepareChildTree = function (c, tree) {

        tree = tree || this.childTree;

        if (c) {
          c.uuidMap = c._parent.uuidMap + ">" + c.uuid;
          c.childTree.length = 0;
          c.childTreeBegin = tree.length;
          c.childTreeDepth = c._parent.childTreeDepth + 1;
          tree.push(c);
        }
        else {
          c = this;
          c.childTree.length = 0;
        }


        for (var i = 0; i < c.children.length; i++) {
          this.prepareChildTree(c.children[i], tree);
        }
        c.childTreeEnd = tree.length;
      };


      gl.Transform.prototype.getSuperParent = function () {
        if (this._parent == null) return (this); else return (this._parent.getSuperParent());
      };

      gl.Transform.prototype.addChild = function (c) {

        if (this.children.indexOf(c) == -1) { 
          c._parent = this;
          this.children.push(c);          
        }
        return c;
      };

      gl.Transform.prototype.removeChild = function (c) {
        var i = this.children.indexOf(c);
        if (i != -1) {
          this.children[i]._parent = null;
          this.children.splice(i, 1);
        }

        return this;
      };

  })(gl);


  /* Renderable object that is made up of geometry nad shader and extend the tranform object  */
  (function (gl) {

    gl.Renderable = function (geometry, shader) {
      gl.Renderable.superclass.call(this);
      this.geometry = geometry;
      this.shader = shader;
      if (geometry.info.attributeSupport & gl.ATTRIBUTES_SUPPORT.NORMALS) {
        this.normalMatrix = mat4.create();
      }

      this.fillColor = new Float32Array([0, 1, 1, 1]);
      this.uuid = guidInteger();
    };
    extend(gl.Renderable, gl.Transform);

    gl.Renderable.prototype.setupUniforms = function (shader) {
      if ((this.geometry.info.attributeSupport & gl.ATTRIBUTES_SUPPORT.UVS)) {
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, this.uTexture);
      }
     
     

      for (gl._index = 0; gl._index < shader._uniforms.length; gl._index++) {
        gl._uni = shader._uniforms[gl._index];
      
        if (gl._uni.location != null) {
         
          gl._uni.params[gl._uni.params.length - 1] = this[gl._uni.name];
          gl._uni.func.apply(gl, gl._uni.params);
        }

      }

    };

    gl.Renderable.prototype.setupAttributes = function (shader) {
      for (gl._index = 0; gl._index < this.geometry.info.buffers.length; gl._index++) {
        gl._item = this.geometry.info.buffers[gl._index];
        if (gl._item.attribute) {
          gl._att = shader.attributes[gl._item.attribute];
          if (gl._att && gl._att.location > -1) {
            gl.enableVertexAttribArray(gl._att.location);
            gl.bindBuffer(gl.ARRAY_BUFFER, gl._item.dest);
            gl.vertexAttribPointer(gl._att.location, gl._item.itemSize, gl.FLOAT, false, 0, 0);
          }
        }


      }
    };

    gl.Renderable.prototype.beginDraw = function (shader) {
      gl.useShader(shader);
    };
    gl.Renderable.prototype.endDraw = function () {
      this.geometry.draw();
    };
    gl.Renderable.prototype.draw = function (shader) {

      this.beginDraw(shader);
      this.setupUniforms(shader);

      this.setupAttributes(shader);
      this.endDraw();


    };


  })(gl);


  /* Perspective camera */
  (function (gl) {
    gl.PerspectiveCamera = function (fov, near, far) {
      gl.PerspectiveCamera.superclass.call(this);
      this.projectionMatrix = mat4.create();
      this.invertedLocalMatrix = mat4.create();

      this.near = near || 0.1;
      this.far = far || 100;
      this.fov = fov || 45;
    
      this.updateProjection();

      this.upVector = vec4.create();
      this.rightVector = vec4.create();
      this.forwardVector = vec4.create();


   

      this.euler =vec3.create();
    };

    extend(gl.PerspectiveCamera, gl.Transform);
    gl.PerspectiveCamera.prototype.updateProjection = function () {

      mat4.perspective(this.projectionMatrix, this.fov * gl.DEG_TO_RAD_HELP,
         parseFloat(gl.canvasElement.width) / parseFloat(gl.canvasElement.height),
         this.near, this.far);

      console.log("projection updated");

    }
    gl.PerspectiveCamera.prototype.updateMatrix = function () {

      



      quat.fromEuler(this.rotation, this.euler[0], this.euler[1], this.euler[2]);
      mat4.fromQuat(this.localMatrix, this.rotation);
     
      mat4.translate(this.localMatrix, this.localMatrix, this.position);

      //Set the modified indicator to false on all the transforms.
      this.position.isModified = false;
      this.rotation.isModified = false;
      this.euler.isModified = false;
      mat4.invert(this.invertedLocalMatrix, this.localMatrix);


      vec4.transformMat4(this.upVector, [0, 1, 0, 0], this.localMatrix);
      vec4.transformMat4(this.rightVector, [1, 0, 0, 0], this.localMatrix);
      vec4.transformMat4(this.forwardVector, [0, 0, -1, 0], this.localMatrix);


      return this.localMatrix;


    };
    gl.PerspectiveCamera.prototype.update = function () {
      if (this.position.isModified || this.scale.isModified || this.euler.isModified) this.updateMatrix();

     


    }

    gl.PerspectiveCamera.prototype.setEulerDegrees = function (x, y, z) {
      this.euler[0] = x * gl.DEG_TO_RAD_HELP;
      this.euler[1] = y * gl.DEG_TO_RAD_HELP;
      this.euler[2] = z * gl.DEG_TO_RAD_HELP;
      this.euler.isModified = true;
      return this;
    }

  })(gl);


  /* Webaudio support */
  (function (gl) {
    // Default settings for panning. Cone parameters are experimentally
    // determined.
    var _PANNING_MODEL = 'HRTF';
    var _DISTANCE_MODEL = 'inverse';
    var _CONE_INNER_ANGLE = 60;
    var _CONE_OUTER_ANGLE = 120;
    var _CONE_OUTER_GAIN = 0.25;
    // Super-simple web audio version detection.
    var _LEGACY_WEBAUDIO = window.hasOwnProperty('webkitAudioContext') && !window.hasOwnProperty('AudioContext');
    if (_LEGACY_WEBAUDIO)
      console.log('AudioPanner outdated version of Web Audio API detected.');


    gl.Audio = {
      // Master audio context. 
      context: (_LEGACY_WEBAUDIO ? new webkitAudioContext() : new AudioContext())
    };


    gl.Audio.AudioSource = function (options) {

      this._src = gl.Audio.context.createBufferSource();
      this._out = gl.Audio.context.createGain();
      this._panner = gl.Audio.context.createPanner();
      this._analyser = gl.Audio.context.createAnalyser();

      this._src.connect(this._out);
      this._out.connect(this._analyser);
      this._analyser.connect(this._panner);
      this._panner.connect(gl.Audio.context.destination);

      this._src.buffer = options.buffer;
      this._src.loop = true;
      this._out.gain.value = options.gain;

      this._analyser.fftSize = 1024;
      this._analyser.smoothingTimeConstant = 0.85;
      this._lastRMSdB = 0.0;

      this._panner.panningModel = _PANNING_MODEL;
      this._panner.distanceModel = _DISTANCE_MODEL;
      this._panner.coneInnerAngle = _CONE_INNER_ANGLE;
      this._panner.coneOuterAngle = _CONE_OUTER_ANGLE;
      this._panner.coneOuterGain = _CONE_OUTER_GAIN;

      this._position = [0, 0, 0];
      this._orientation = [1, 0, 0];

      this._analyserBuffer = new Uint8Array(this._analyser.fftSize);

      if (!_LEGACY_WEBAUDIO) {
        this._src.detune.value = (options.detune || 0);
        this._analyserBuffer = new Float32Array(this._analyser.fftSize);
      }

      this.setPosition(options.position);
      this.setOrientation(options.orientation);

    };

    gl.Audio.AudioSource.prototype.start = function () {
      this._src.start(0);
    };

    gl.Audio.AudioSource.prototype.stop = function () {
      this._src.stop(0);
    };

    gl.Audio.AudioSource.prototype.getPosition = function () {
      return this._position;
    };

    gl.Audio.AudioSource.prototype.setPosition = function (position) {
      if (position) {
        this._position[0] = position[0];
        this._position[1] = position[1];
        this._position[2] = position[2];
      }

      this._panner.setPosition.apply(this._panner, this._position);
    };

    gl.Audio.AudioSource.prototype.getOrientation = function () {
      return this._orientation;
    };

    gl.Audio.AudioSource.prototype.setOrientation = function (orientation) {
      if (orientation) {
        this._orientation[0] = orientation[0];
        this._orientation[1] = orientation[1];
        this._orientation[2] = orientation[2];
      }

      this._panner.setOrientation.apply(this._panner, this._orientation);
    };

    gl.Audio.AudioSource.prototype.getCubeScale = function () {
      // Safari does not support getFloatTimeDomainData(), so fallback to the
      // naive spectral energy sum. This is relative expensive.
      if (_LEGACY_WEBAUDIO) {
        this._analyser.getByteFrequencyData(this._analyserBuffer);

        for (var k = 0, total = 0; k < this._analyserBuffer.length; ++k)
          total += this._analyserBuffer[k];
        total /= this._analyserBuffer.length;

        return (total / 256.0) * 1.5;
      }

      this._analyser.getFloatTimeDomainData(this._analyserBuffer);
      for (var i = 0, sum = 0; i < this._analyserBuffer.length; ++i)
        sum += this._analyserBuffer[i] * this._analyserBuffer[i];

      // Calculate RMS and convert it to DB for perceptual loudness.
      var rms = Math.sqrt(sum / this._analyserBuffer.length);
      var db = 30 + 10 / Math.LN10 * Math.log(rms <= 0 ? 0.0001 : rms);

      // Moving average with the alpha of 0.525. Experimentally determined.
      this._lastRMSdB += 0.525 * ((db < 0 ? 0 : db) - this._lastRMSdB);

      // Scaling by 1/30 is also experimentally determined.
      return this._lastRMSdB / 30.0;
    };

    //load a file into a buffer
    gl.Audio.loadAudioFile = function (url, done) {
      var xhr = new XMLHttpRequest();
      xhr.open('GET', url);
      xhr.responseType = 'arraybuffer';

      xhr.onload = function () {
        if (xhr.status === 200) {
          gl.Audio.context.decodeAudioData(xhr.response,
            function (buffer) {
              console.log('Webaudio File loaded: ' + url);
              done(url, buffer);
            },
            function (message) {
              console.log('Webaudio Decoding failure: ' + url + ' (' + message + ')');
              done(url, null);
            });
        } else {
          console.log('Webaudio XHR Error: ' + url + ' (' + xhr.statusText + ')');
          done(url, null);
        }
      };

      xhr.onerror = function (event) {
        console.log('Webaudio XHR Network failure: ' + url);
        done(url, null);
      };

      xhr.send();
    };


    gl.Audio.setListenerPosition = function (position) {
      gl.Audio.context.listener.setPosition.apply(gl.Audio.context.listener, position);
    };

    /**
     * Static method for updating listener's orientation.
     * @param {Array} orientation Listener orientation in x, y, z.
     * @param {Array} orientation Listener's up vector in x, y, z.
     */
    gl.Audio.setListenerOrientation = function (orientation, upvector) {
      gl.Audio.context.listener.setOrientation(
        orientation[0], orientation[1], orientation[2],
        upvector[0], upvector[1], upvector[2]);
    };

    gl.Audio.getListenerPositionDirection = (function () {
      var tmpPosition = vec3.create();
      var tmpDirection = vec3.create();
      var tmpUp = vec3.create();
      var tmpOrientation = quat.create();
      return function (poseMat) {
        mat4.getTranslation(tmpPosition, poseMat);
        mat4.getRotation(tmpOrientation, poseMat);
        vec3.transformQuat(tmpDirection, [0, 0, -1], tmpOrientation);
        vec3.transformQuat(tmpUp, [0, 1, 0], tmpOrientation);
        vec3.normalize(tmpDirection, tmpDirection);
        return {
          position: tmpPosition,
          direction: tmpDirection,
          up: tmpUp
        };
      };
    })();


  })(gl);


  /* WebVR handling   */
  gl.initVR = function () {
    var tmpMat = mat4.create();
    gl.VR = {
      gamepads:navigator.getGamepads(),
      enterToVrButton: document.createElement("button"),
      vrDisplay: null, frameData: null,poseMat:mat4.create(),

      onVRPresentChange: function (e) {
        gl.OnResize();
        if (gl.VR.vrDisplay.isPresenting) {
          if (gl.VR.vrDisplay.capabilities.hasExternalDisplay) {
            gl.VR.enterToVrButton.innerHTML = "Exit From VR";
          }
        } else {
          if (gl.VR.vrDisplay.capabilities.hasExternalDisplay) {
            gl.VR.enterToVrButton.innerHTML = "Enter To VR";
          }
        }

      },
      onVRRequestPresent: function (e) {

        this.vrDisplay.requestPresent([{ source: gl.canvasElement }]).then(
          function () { }, function (err) {
            var errMsg = "requestPresent failed.";
            if (err && err.message) {
              errMsg += "<br/>" + err.message
            }
            alert(errMsg);
          });
      },
      onVRExitPresent: function (e) {
        if (!gl.VR.vrDisplay.isPresenting)
          return;
        gl.VR.vrDisplay.exitPresent().then(function () {
        }, function (err) {
          var errMsg = "exitPresent failed.";
          if (err && err.message) {
            errMsg += "<br/>" + err.message
          }
          alert(errMsg, 2000);
        });
      },

      // Register for mouse unrestricted events while in VR
      // (e.g. mouse once again available on desktop 2D view)
      onDisplayPointerUnrestricted: function () {
        var lock = document.pointerLockElement;
        if (lock && lock === webglCanvas && document.exitPointerLock) {
          document.exitPointerLock();
        }
      },
      // Register for mouse restricted events while in VR
      // (e.g. mouse no longer available on desktop 2D view)
      onDisplayPointerRestricted: function () {
        if (gl.canvasElement && gl.canvasElement.requestPointerLock) {
          gl.canvasElement.requestPointerLock();
        }
      },
      presentVRDisplay: function (renderLeftEye, renderRightEye) {

        this.vrDisplay.getFrameData(this.frameData);

        gl.viewport(0, 0, gl.canvasElement.width * 0.5, gl.canvasElement.height);
        renderLeftEye(this.frameData.leftProjectionMatrix, this.frameData.leftViewMatrix);

        gl.viewport(gl.canvasElement.width * 0.5, 0, gl.canvasElement.width * 0.5, gl.canvasElement.height);
        renderRightEye(this.frameData.rightProjectionMatrix, this.frameData.rightViewMatrix);

        this.vrDisplay.submitFrame();

        this.getPoseMatrix(this.poseMat, this.frameData.pose);
        // Compute the listener position/direction.
        var listener = gl.Audio.getListenerPositionDirection(this.poseMat);

        //set audio listener position and orientation according pose in VR
        gl.Audio.setListenerPosition(listener.position);
        gl.Audio.setListenerOrientation(listener.direction, listener.up);

        var gamepads = gl.VR.gamepads;
        for (var i = 0; i < gamepads.length; ++i) {
          var gamepad = gamepads[i];
          // Ensure the gamepad is valid and has buttons.
          if (gamepad &&
              gamepad.buttons.length) {
            var lastState = lastButtonState[i] || false;
            var newState = gamepad.buttons[0].pressed;
            // If the primary button state has changed from not pressed to pressed 
            // over the last frame then fire the callback.
            if (newState && !lastState) {
              gl.OnClick(gamepad);
            }
            lastButtonState[i] = newState;
          }
        }


      },



      getStandingViewMatrix: function (out, view, playerHeight) {
        playerHeight = playerHeight || 1.65;
        if (gl.VR.vrDisplay.stageParameters) {
          mat4.invert(out, gl.VR.vrDisplay.stageParameters.sittingToStandingTransform);
          mat4.multiply(out, view, out);
        } else {
          mat4.identity(out);
          mat4.translate(out, out, [0, playerHeight, 0]);
          mat4.invert(out, out);
          mat4.multiply(out, view, out);
        }
      },
      // Generate a matrix from the pose, which will represent the center of the  user's head.
      getPoseMatrix: function (out, pose, playerHeight) {
        var orientation = pose.orientation;
        var position = pose.position;
        if (!orientation) { orientation = [0, 0, 0, 1]; }
        if (!position) { position = [0, 0, 0]; }

        mat4.fromRotationTranslation(tmpMat, orientation, position);
        mat4.invert(tmpMat, tmpMat);
        gl.VR.getStandingViewMatrix(out, tmpMat, playerHeight);
        mat4.invert(out, out);
      },

    };

 


    gl.VR.enterToVrButton.innerHTML = "Enter To VR";

    gl.VR.enterToVrButton.style.position = "absolute";
    gl.VR.enterToVrButton.style.right = "5px";
    gl.VR.enterToVrButton.style.bottom = "5px";
    gl.VR.enterToVrButton.style.padding = "10px";

    gl.VR.enterToVrButton.onclick = function () {
      if (gl.VR.vrDisplay.isPresenting) {
        gl.VR.onVRExitPresent();
      }
      else {
        gl.VR.onVRRequestPresent();
      }
      

    };

    var polyfill = new WebVRPolyfill({ PROVIDE_MOBILE_VRDISPLAY: true });
 

    if (navigator.getVRDisplays) {
     gl.VR.frameData = new VRFrameData();

      navigator.getVRDisplays().then(function (displays) {
        if (displays.length > 0) {
          gl.VR.vrDisplay = displays[displays.length - 1];
          gl.VR.vrDisplay.depthNear = 0.1;
          gl.VR.vrDisplay.depthFar = 1024.0;
          if (gl.VR.vrDisplay.capabilities.canPresent) {
            gl.VR.canPresent = true;
            gl.canvasElement.parentNode.appendChild(gl.VR.enterToVrButton);
          }
          window.addEventListener('vrdisplaypresentchange', gl.VR.onVRPresentChange, false);
          window.addEventListener('vrdisplayactivate', gl.VR.onVRRequestPresent, false);
          window.addEventListener('vrdisplaydeactivate', gl.VR.onVRExitPresent, false);


          window.addEventListener('vrdisplaypointerrestricted', gl.VR.onDisplayPointerRestricted);
          window.addEventListener('vrdisplaypointerunrestricted', gl.VR.onDisplayPointerUnrestricted);



        } else {
          alert("WebVR supported, but no VRDisplays found.");
        }
      }, function () {
        alert("Your browser does not support WebVR.");
      });
    } else if (navigator.getVRDevices) {
      alert("Your browser supports WebVR but not the latest version.");
    } else {
      alert("Your browser does not support WebVR.");
    }


  };
 
  /* canvas resize handling  */
  gl.OnResize = function () {
    if (this.VR) {
      if (this.VR.vrDisplay && this.VR.vrDisplay.isPresenting) {
        var leftEye = this.VR.vrDisplay.getEyeParameters("left");
        var rightEye = this.VR.vrDisplay.getEyeParameters("right");
        gl.canvasElement.width = Math.max(leftEye.renderWidth, rightEye.renderWidth) * 2;
        gl.canvasElement.height = Math.max(leftEye.renderHeight, rightEye.renderHeight);
      } else {
        gl.canvasElement.width = gl.canvasElement.offsetWidth * window.devicePixelRatio;
        gl.canvasElement.height = gl.canvasElement.offsetHeight * window.devicePixelRatio;
      }
    }
    else {
      gl.canvasElement.width = gl.canvasElement.offsetWidth * window.devicePixelRatio;
      gl.canvasElement.height = gl.canvasElement.offsetHeight * window.devicePixelRatio;
    }

    gl.OnAfterResize();
  };



  gl.enterFullscreen = function () {
    if (this.canvasElement.requestFullscreen) {
      this.canvasElement.requestFullscreen();
    } else if (this.canvasElement.mozRequestFullScreen) {
      this.canvasElement.mozRequestFullScreen();
    } else if (this.canvasElement.webkitRequestFullscreen) {
      this.canvasElement.webkitRequestFullscreen();
    } else if (this.canvasElement.msRequestFullscreen) {
      this.canvasElement.msRequestFullscreen();
    }
  };


  /* load all the resources from urls and create shaders , textures and geometries  */
  gl.loadResourcesFromUrls = function (urls, done) {
    var data = { geometries: {}, shaders: {}, textures: {}, extras: {}};
    eachItem(urls, function (url, next) {
      var filename = url.substring(url.lastIndexOf('/') + 1);
      if (filename.indexOf(".jpg") > 0 || filename.indexOf(".png") > 0) {
        var img = new Image();
        img.onload = function () {
          data.textures[filename] = gl.LoadTexture(filename, this);
          next.call();
        }
        img.src = url;

      }
      else {
        loadUrl(url).onload = function () {
          if (filename.indexOf(".obj") > 0) {
           data.geometries[filename] = gl.Geometry.waveFrontObj(this.response);

          }
          else if (filename.indexOf(".vert") > 0 || filename.indexOf(".frag") > 0) {
            var shaderName = filename.replace(".vert", "").replace(".frag", "");
            data.shaders[filename] = this.response;
            if (data.shaders[shaderName + ".vert"] && data.shaders[shaderName + ".frag"]) {
              data.shaders[shaderName] = new gl.Shader(
                data.shaders[shaderName + ".vert"],
                data.shaders[shaderName + ".frag"]);

              delete data.shaders[shaderName + ".vert"];
              delete data.shaders[shaderName + ".frag"];
            }

            
          }
          else {
            data.extras[filename] = this.response;
          }
          next.call();
        }
      }


    }, function () {

      done(data);
    });

  }
  

  gl.OnResize();
  return gl;
};



