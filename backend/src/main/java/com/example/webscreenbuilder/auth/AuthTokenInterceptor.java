package com.example.webscreenbuilder.auth;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.HandlerInterceptor;

import java.io.IOException;

@Component
public class AuthTokenInterceptor implements HandlerInterceptor {

  public static final String MVP_TOKEN = "mock-token";

  @Override
  public boolean preHandle(HttpServletRequest request, HttpServletResponse response, Object handler)
    throws IOException {
    if ("OPTIONS".equalsIgnoreCase(request.getMethod()) || isLoginRequest(request)) {
      return true;
    }

    String authorization = request.getHeader("Authorization");
    if (("Bearer " + MVP_TOKEN).equals(authorization)) {
      return true;
    }

    response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
    response.setContentType(MediaType.APPLICATION_JSON_VALUE);
    response.getWriter().write("{\"error\":\"authentication is required\"}");
    return false;
  }

  private boolean isLoginRequest(HttpServletRequest request) {
    return "POST".equalsIgnoreCase(request.getMethod())
      && "/api/auth/login".equals(request.getRequestURI());
  }
}
