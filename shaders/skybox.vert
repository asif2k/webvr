precision mediump float;
attribute vec3 a_position;

uniform mat4 gb_cam_proj_mat;
uniform mat4 gb_cam_view_mat;

varying vec3 vCoords;
void main() {
	vec4 eyeCoords = gb_cam_view_mat * vec4(a_position,1.0);
	gl_Position = gb_cam_proj_mat * eyeCoords;
	vCoords = a_position;
}