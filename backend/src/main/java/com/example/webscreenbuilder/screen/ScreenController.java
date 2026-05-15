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
      row.put("allowRuntimePersonalization", Boolean.TRUE.equals(body.get("allowRuntimePersonalization")));
      row.put("isInitialScreen", Boolean.TRUE.equals(body.get("isInitialScreen")));
      row.put("components", components);
      row.put("communications", communications);

      ensureScreenDir();
      objectMapper.writerWithDefaultPrettyPrinter().writeValue(screenPath(screenId).toFile(), row);
      if (Boolean.TRUE.equals(row.get("isInitialScreen"))) {
        clearOtherInitialScreens(screenId);
      }
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
    return ResponseEntity.ok(Map.of("screenId", screenId, "components", List.of(), "communications", List.of()));
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
        "name", screen.getOrDefault("name", ""),
        "allowRuntimePersonalization", screen.getOrDefault("allowRuntimePersonalization", false),
        "isInitialScreen", screen.getOrDefault("isInitialScreen", false)
      ));
    } catch (IOException ignored) {
      // Ignore broken MVP data files so one bad file does not break the designer list.
    }
  }

  private void ensureScreenDir() throws IOException {
    Files.createDirectories(screenDir);
  }

  private void clearOtherInitialScreens(String screenId) throws IOException {
    try (var stream = Files.list(screenDir)) {
      for (Path path : stream.filter(item -> item.getFileName().toString().endsWith(".json")).toList()) {
        Map<String, Object> screen = objectMapper.readValue(path.toFile(), new TypeReference<>() {});
        if (!screenId.equals(screen.get("screenId")) && Boolean.TRUE.equals(screen.get("isInitialScreen"))) {
          screen.put("isInitialScreen", false);
          objectMapper.writerWithDefaultPrettyPrinter().writeValue(path.toFile(), screen);
        }
      }
    }
  }

  private Path screenPath(String screenId) {
    return screenDir.resolve(screenId + ".json").normalize();
  }

  private boolean isValidId(String value) {
    return value != null && value.matches("[A-Za-z0-9_-]+");
  }
}
