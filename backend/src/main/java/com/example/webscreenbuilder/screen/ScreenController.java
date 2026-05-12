package com.example.webscreenbuilder.screen;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@RestController
@RequestMapping("/api/screens")
@CrossOrigin
public class ScreenController {

  private final ObjectMapper objectMapper = new ObjectMapper();

  /** In-memory saved screens (MVP). Key = screenId. */
  private final Map<String, Map<String, Object>> saved = new ConcurrentHashMap<>();

  @PostMapping
  public ResponseEntity<?> save(@RequestBody Map<String, Object> body) {
    String screenId = body.get("screenId") instanceof String s ? s : null;
    String json = body.get("json") instanceof String s ? s : null;
    if (screenId == null || screenId.isBlank() || json == null) {
      return ResponseEntity.badRequest().body(Map.of("error", "screenId and json are required"));
    }
    try {
      JsonNode root = objectMapper.readTree(json);
      JsonNode compNode = root.get("components");
      if (compNode == null || !compNode.isArray()) {
        return ResponseEntity.badRequest().body(Map.of("error", "json must contain a components array"));
      }
      Object components = objectMapper.convertValue(compNode, Object.class);
      Map<String, Object> row = new LinkedHashMap<>();
      row.put("screenId", screenId);
      row.put("name", body.getOrDefault("name", ""));
      row.put("components", components);
      saved.put(screenId, row);
      return ResponseEntity.ok(Map.of("ok", true));
    } catch (Exception e) {
      return ResponseEntity.badRequest().body(Map.of("error", "invalid json"));
    }
  }

  @GetMapping("/{screenId}")
  public Map<String, Object> get(@PathVariable String screenId) {
    if (saved.containsKey(screenId)) {
      return saved.get(screenId);
    }
    if (!"sample-screen".equals(screenId)) {
      return Map.of("screenId", screenId, "components", List.of());
    }

    return Map.of(
      "screenId", "sample-screen",
      "name", "Sample Screen",
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
