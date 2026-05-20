package com.example.webscreenbuilder.auth;

import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.InterceptorRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

@Configuration
public class WebConfig implements WebMvcConfigurer {

  private final AuthTokenInterceptor authTokenInterceptor;

  public WebConfig(AuthTokenInterceptor authTokenInterceptor) {
    this.authTokenInterceptor = authTokenInterceptor;
  }

  @Override
  public void addInterceptors(InterceptorRegistry registry) {
    registry.addInterceptor(authTokenInterceptor).addPathPatterns("/api/**");
  }
}
