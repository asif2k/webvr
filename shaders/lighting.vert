precision highp float;
attribute vec3 a_position;
attribute vec3 a_normal;        
attribute vec2 a_uv;


uniform mat4 gb_cam_proj_mat;
uniform mat4 gb_cam_view_mat;

uniform vec3 gb_light_pos;

uniform mat4 worldMatrix;
uniform mat4 normalMatrix;


varying vec2 vUV;
varying vec3 vLighting;
            
void main(void){
    gl_Position =gb_cam_proj_mat*gb_cam_view_mat*worldMatrix*vec4(a_position, 1.0);
    vUV=a_uv;

	// Apply lighting effect

      vec3 ambientLight = vec3(0.3, 0.3, 0.3);
      vec3 directionalLightColor = vec3(0.8, 0.8, 0.8);
      vec3 directionalVector = normalize(gb_light_pos);

      vec4 transformedNormal =vec4(a_normal, 1.0);//  normalMatrix * vec4(a_normal, 1.0);

      float directional = max(dot(transformedNormal.xyz, directionalVector), 0.0);
      vLighting = ambientLight + (directionalLightColor * directional);

}