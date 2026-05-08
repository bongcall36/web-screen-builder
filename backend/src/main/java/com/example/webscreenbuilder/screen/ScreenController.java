package com.example.webscreenbuilder.screen;

import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/screens")
@CrossOrigin
public class ScreenController {

  @GetMapping("/{screenId}")
  public Map<String, Object> get(@PathVariable String screenId) {
    if (!"sample-screen".equals(screenId)) {
      return Map.of("screenId", screenId, "components", List.of());
    }

    return Map.of(
      "screenId", "sample-screen",
      "components", List.of(
        Map.of("id", "input1", "type", "Input", "props", Map.of("placeholder", "Type keyword")),
        Map.of("id", "button1", "type", "Button", "props", Map.of("text", "Search")),
        Map.of(
          "id", "grid1",
          "type", "AgGrid",
          "props", Map.of(
            "columnDefs", List.of(Map.of("field", "id"), Map.of("field", "name")),
            "rowData", List.of(Map.of("id", 1, "name", "Alice"), Map.of("id", 2, "name", "Bob"))
          )
        )
      )
    );
  }
}
