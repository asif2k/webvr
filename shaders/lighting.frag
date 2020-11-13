precision highp float;
varying vec2 vUV;
varying vec3 vLighting;
uniform sampler2D uTexture;

uniform int uHover;
void main(void){ 

	 vec4 texelColor = vec4(texture2D(uTexture, vUV));

      gl_FragColor = vec4(texelColor.rgb * vLighting, texelColor.a);
	  if(uHover==1){

	  gl_FragColor+=vec4(0.4,0.0,0.0,0.8);

	  }
}