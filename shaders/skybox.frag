precision mediump float;
varying vec3 vCoords;
uniform samplerCube skybox;
void main() {
	gl_FragColor = textureCube(skybox, vCoords);
	
}