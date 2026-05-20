package com.example.webscreenbuilder.communication;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.DeleteMapping;
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
import java.util.Locale;
import java.util.Map;

@RestController
@RequestMapping("/api/communications")
@CrossOrigin
public class CommunicationController {

  private final ObjectMapper objectMapper = new ObjectMapper();
  private final Path formatDir = Path.of("data", "communication-formats");

  @GetMapping("/formats")
  public List<Map<String, Object>> formats() throws IOException {
    ensureFormatDir();
    List<Map<String, Object>> rows = new ArrayList<>();
    if (!Files.exists(formatPath("searchUsers"))) {
      rows.add(sampleFormat());
    }
    try (var stream = Files.list(formatDir)) {
      stream
        .filter(path -> path.getFileName().toString().endsWith(".json"))
        .sorted()
        .forEach(path -> readFormat(path, rows));
    }
    return rows;
  }

  @PostMapping("/formats")
  public ResponseEntity<?> saveFormat(@RequestBody Map<String, Object> body) {
    String id = body.get("id") instanceof String s ? s : null;
    if (!isValidId(id)) {
      return ResponseEntity.badRequest().body(Map.of("error", "valid id is required"));
    }
    try {
      ensureFormatDir();
      Map<String, Object> row = new LinkedHashMap<>();
      row.put("id", id);
      row.put("name", body.getOrDefault("name", id));
      row.put("inputFields", body.getOrDefault("inputFields", List.of()));
      row.put("outputFields", body.getOrDefault("outputFields", List.of("rows")));
      row.put("sampleRows", body.getOrDefault("sampleRows", List.of()));
      objectMapper.writerWithDefaultPrettyPrinter().writeValue(formatPath(id).toFile(), row);
      return ResponseEntity.ok(Map.of("ok", true));
    } catch (IOException e) {
      return ResponseEntity.internalServerError().body(Map.of("error", "could not save format"));
    }
  }

  @DeleteMapping("/formats/{formatId}")
  public ResponseEntity<?> deleteFormat(@PathVariable String formatId) {
    if (!isValidId(formatId)) {
      return ResponseEntity.badRequest().body(Map.of("error", "invalid formatId"));
    }
    try {
      Files.deleteIfExists(formatPath(formatId));
      return ResponseEntity.ok(Map.of("ok", true));
    } catch (IOException e) {
      return ResponseEntity.internalServerError().body(Map.of("error", "could not delete format"));
    }
  }

  @PostMapping("/{actionId}/execute")
  public ResponseEntity<?> execute(@PathVariable String actionId, @RequestBody Map<String, Object> body)
    throws IOException {
    if (!isValidId(actionId)) {
      return ResponseEntity.badRequest().body(Map.of("error", "invalid actionId"));
    }

    Map<String, Object> format = readFormatById(actionId);
    List<?> sampleRows = format.getOrDefault("sampleRows", List.of()) instanceof List<?> formatRows
      ? formatRows
      : List.of();

    Map<?, ?> input = normalizeInput(body);
    String keyword = findKeyword(input);
    List<?> resultRows = keyword.isBlank()
      ? sampleRows
      : sampleRows.stream().filter(row -> containsKeyword(row, keyword)).toList();

    return ResponseEntity.ok(Map.of(firstOutputField(format), resultRows));
  }

  private void readFormat(Path path, List<Map<String, Object>> rows) {
    try {
      rows.add(objectMapper.readValue(path.toFile(), new TypeReference<>() {}));
    } catch (IOException ignored) {
      // Ignore broken MVP files.
    }
  }

  private Map<String, Object> readFormatById(String id) throws IOException {
    Path path = formatPath(id);
    if (Files.exists(path)) {
      return objectMapper.readValue(path.toFile(), new TypeReference<>() {});
    }
    if ("searchUsers".equals(id)) {
      return sampleFormat();
    }
    return Map.of("id", id, "sampleRows", List.of());
  }

  private Map<String, Object> sampleFormat() {
    return Map.of(
      "id", "searchUsers",
      "name", "Search Users",
      "inputFields", List.of("keyword"),
      "outputFields", List.of("rows"),
      "sampleRows", List.of(
        Map.of("id", 1, "name", "Alice"),
        Map.of("id", 2, "name", "Bob"),
        Map.of("id", 3, "name", "Charlie")
      )
    );
  }

  private void ensureFormatDir() throws IOException {
    Files.createDirectories(formatDir);
  }

  private Path formatPath(String id) {
    return formatDir.resolve(id + ".json").normalize();
  }

  private boolean isValidId(String value) {
    return value != null && value.matches("[A-Za-z0-9_-]+");
  }

  private Map<?, ?> normalizeInput(Map<String, Object> body) {
    if (body.get("input") instanceof Map<?, ?> legacyInput) {
      return legacyInput;
    }
    return body;
  }

  private String findKeyword(Map<?, ?> inputMap) {
    return inputMap.values().stream()
      .filter(String.class::isInstance)
      .map(String.class::cast)
      .findFirst()
      .orElse("")
      .trim()
      .toLowerCase(Locale.ROOT);
  }

  private boolean containsKeyword(Object row, String keyword) {
    if (!(row instanceof Map<?, ?> rowMap)) {
      return false;
    }
    return rowMap.values().stream()
      .map(String::valueOf)
      .map(value -> value.toLowerCase(Locale.ROOT))
      .anyMatch(value -> value.contains(keyword));
  }

  private String firstOutputField(Map<String, Object> format) {
    Object outputFields = format.get("outputFields");
    if (outputFields instanceof List<?> fields) {
      return fields.stream()
        .filter(String.class::isInstance)
        .map(String.class::cast)
        .filter(field -> !field.isBlank())
        .findFirst()
        .orElse("rows");
    }
    return "rows";
  }
}
