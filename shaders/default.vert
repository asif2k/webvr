precision mediump float;
attribute vec3 a_position;        


uniform mat4 gb_cam_proj_mat;
uniform mat4 gb_cam_view_mat;
uniform mat4 worldMatrix;
            
void main(void){
    gl_Position =gb_cam_proj_mat*gb_cam_view_mat*worldMatrix*vec4(a_position, 1.0);    
}