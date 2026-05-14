package com.example.webscreenbuilder.screen;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/screens")
@CrossOrigin
public class ScreenController {

  private final ObjectMapper objectMapper = new ObjectMapper();
  private final Path screenDir = Path.of("data", "screens");

  @GetMapping
  public List<Map<String, Object>> list() throws IOException {
    ensureScreenDir();
    List<Map<String, Object>> rows = new ArrayList<>();
    if (!Files.exists(screenPath("sample-screen"))) {
      rows.add(Map.of("screenId", "sample-screen", "name", "Sample Screen"));
    }

    try (var stream = Files.list(screenDir)) {
      stream
        .filter(path -> path.getFileName().toString().endsWith(".json"))
        .sorted()
        .forEach(path -> readScreenSummary(path, rows));
    }
    return rows;
  }

  @PostMapping
  public ResponseEntity<?> save(@RequestBody Map<String, Object> body) {
    String screenId = body.get("screenId") instanceof String s ? s : null;
    String json = body.get("json") instanceof String s ? s : null;
    if (!isValidId(screenId) || json == null) {
      return ResponseEntity.badRequest().body(Map.of("error", "valid screenId and json are required"));
    }
    try {
      JsonNode root = objectMapper.readTree(json);
      JsonNode compNode = root.get("components");
      if (compNode == null || !compNode.isArray()) {
        return ResponseEntity.badRequest().body(Map.of("error", "json must contain a components array"));
      }

      Object components = objectMapper.convertValue(compNode, Object.class);
      JsonNode commNode = root.get("communications");
      Object communications = commNode != null && commNode.isArray()
        ? objectMapper.convertValue(commNode, Object.class)
        : List.of();

      Map<String, Object> row = new LinkedHashMap<>();
      row.put("screenId", screenId);
      row.put("name", body.getOrDefault("name", ""));
      row.put("components", components);
      row.put("communications", communications);

      ensureScreenDir();
      objectMapper.writerWithDefaultPrettyPrinter().writeValue(screenPath(screenId).toFile(), row);
      return ResponseEntity.ok(Map.of("ok", true));
    } catch (Exception e) {
      return ResponseEntity.badRequest().body(Map.of("error", "invalid json"));
    }
  }

  @GetMapping("/{screenId}")
  public ResponseEntity<?> get(@PathVariable String screenId) throws IOException {
    if (!isValidId(screenId)) {
      return ResponseEntity.badRequest().body(Map.of("error", "invalid screenId"));
    }
    Path path = screenPath(screenId);
    if (Files.exists(path)) {
      return ResponseEntity.ok(objectMapper.readValue(path.toFile(), new TypeReference<Map<String, Object>>() {}));
    }
    if (!"sample-screen".equals(screenId)) {
      return ResponseEntity.ok(Map.of("screenId", screenId, "components", List.of(), "communications", List.of()));
    }
    return ResponseEntity.ok(sampleScreen());
  }

  @DeleteMapping("/{screenId}")
  public ResponseEntity<?> delete(@PathVariable String screenId) {
    if (!isValidId(screenId)) {
      return ResponseEntity.badRequest().body(Map.of("error", "invalid screenId"));
    }
    try {
      Files.deleteIfExists(screenPath(screenId));
      return ResponseEntity.ok(Map.of("ok", true));
    } catch (IOException e) {
      return ResponseEntity.internalServerError().body(Map.of("error", "could not delete screen"));
    }
  }

  private void readScreenSummary(Path path, List<Map<String, Object>> rows) {
    try {
      Map<String, Object> screen = objectMapper.readValue(path.toFile(), new TypeReference<>() {});
      rows.add(Map.of(
        "screenId", screen.getOrDefault("screenId", ""),
        "name", screen.getOrDefault("name", "")
      ));
    } catch (IOException ignored) {
      // Ignore broken MVP data files so one bad file does not break the designer list.
    }
  }

  private Map<String, Object> sampleScreen() {
    return Map.of(
      "screenId", "sample-screen",
      "name", "Sample Screen",
      "communications", List.of(
        Map.of(
          "id", "searchUsers",
          "name", "Search Users",
          "formatId", "searchUsers",
          "triggerComponentId", "button1",
          "inputBindings", List.of(Map.of("field", "keyword", "componentId", "input1")),
          "outputBindings", List.of(Map.of("field", "rows", "componentId", "grid1"))
        )
      ),
      "components", List.of(
        Map.of("id", "input1", "type", "Input", "props", Map.of("placeholder", "Type keyword")),
        Map.of("id", "button1", "type", "Button", "props", Map.of("text", "Search", "actionId", "searchUsers")),
        Map.of(
          "id", "grid1",
          "type", "AgGrid",
          "props", Map.of(
            "columnDefs", List.of(
              Map.of("field", "id", "dataType", "number"),
              Map.of("field", "name", "dataType", "string")
            ),
            "rowData", List.of(Map.of("id", 1, "name", "Alice"), Map.of("id", 2, "name", "Bob"))
          )
        )
      )
    );
  }

  private void ensureScreenDir() throws IOException {
    Files.createDirectories(screenDir);
  }

  private Path screenPath(String screenId) {
    return screenDir.resolve(screenId + ".json").normalize();
  }

  private boolean isValidId(String value) {
    return value != null && value.matches("[A-Za-z0-9_-]+");
  }
}
