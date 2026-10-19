package io.github.danieltinois.resumetailor.resume;

import java.io.IOException;
import java.io.InputStream;
import java.io.UncheckedIOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Comparator;
import java.util.List;
import java.util.concurrent.Semaphore;
import java.util.concurrent.TimeUnit;
import java.util.stream.Stream;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

import tools.jackson.databind.json.JsonMapper;

/**
 * Renders a {@link ResumeDocument} to PDF with the Typst CLI. The document
 * reaches Typst as a JSON file through {@code --input}, never as generated
 * Typst source, so user text cannot become markup.
 */
@Component
public class TypstRenderer implements AutoCloseable {

    private static final Logger LOG = LoggerFactory.getLogger(TypstRenderer.class);
    private static final String TEMPLATE = "resume.typ";
    private static final List<String> FONTS = List.of(
            "Carlito-Regular.ttf", "Carlito-Bold.ttf", "Carlito-Italic.ttf", "Carlito-BoldItalic.ttf");

    private final TypstProperties properties;
    private final Semaphore slots;
    private final JsonMapper json = JsonMapper.builder().build();
    private final Path assets;
    private final Path template;
    private final Path fonts;

    public TypstRenderer(TypstProperties properties) {
        this.properties = properties;
        int limit = properties.maxConcurrent() > 0
                ? properties.maxConcurrent()
                : Runtime.getRuntime().availableProcessors();
        this.slots = new Semaphore(limit, true);
        try {
            this.assets = Files.createTempDirectory("resume-typst-");
            this.template = extract("typst/" + TEMPLATE, assets.resolve(TEMPLATE));
            this.fonts = Files.createDirectory(assets.resolve("fonts"));
            for (String font : FONTS) {
                extract("typst/fonts/" + font, fonts.resolve(font));
            }
        } catch (IOException e) {
            throw new UncheckedIOException("Cannot unpack the Typst template", e);
        }
    }

    public byte[] render(ResumeDocument document) {
        try {
            slots.acquire();
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            throw new RenderException("Interrupted while waiting to render", e);
        }
        Path dir = null;
        try {
            dir = Files.createTempDirectory("resume-render-");
            return compile(dir, document);
        } catch (IOException e) {
            throw new RenderException("Typst could not run: " + e.getMessage(), e);
        } finally {
            slots.release();
            deleteQuietly(dir);
        }
    }

    /** Deletes the unpacked template and fonts. Spring calls it when the context closes. */
    @Override
    public void close() {
        deleteQuietly(assets);
    }

    private byte[] compile(Path dir, ResumeDocument document) throws IOException {
        // --root covers the render dir only, so the template is copied next to its data.
        Files.copy(template, dir.resolve(TEMPLATE));
        Files.writeString(dir.resolve("resume.json"), json.writeValueAsString(document), StandardCharsets.UTF_8);
        Path stderr = dir.resolve("stderr.txt");

        Process process = new ProcessBuilder(properties.binary(), "compile",
                "--root", dir.toString(),
                "--font-path", fonts.toString(),
                "--ignore-system-fonts",
                "--input", "resume=resume.json",
                TEMPLATE, "out.pdf")
                .directory(dir.toFile())
                .redirectOutput(ProcessBuilder.Redirect.DISCARD)
                .redirectError(stderr.toFile())
                .start();
        try {
            if (!process.waitFor(properties.timeout().toMillis(), TimeUnit.MILLISECONDS)) {
                process.destroyForcibly().waitFor();
                throw new RenderException("typst timed out after " + properties.timeout());
            }
        } catch (InterruptedException e) {
            process.destroyForcibly();
            Thread.currentThread().interrupt();
            throw new RenderException("Interrupted while rendering", e);
        }
        if (process.exitValue() != 0) {
            // stderr names template paths and Typst internals: it goes to the log, not to callers.
            LOG.warn("typst failed with exit code {}: {}", process.exitValue(), Files.readString(stderr).strip());
            throw new RenderException("typst failed with exit code " + process.exitValue());
        }
        return Files.readAllBytes(dir.resolve("out.pdf"));
    }

    private static Path extract(String resource, Path target) throws IOException {
        try (InputStream in = TypstRenderer.class.getClassLoader().getResourceAsStream(resource)) {
            if (in == null) {
                throw new IOException("missing classpath resource " + resource);
            }
            Files.copy(in, target);
        }
        return target;
    }

    private static void deleteQuietly(Path dir) {
        if (dir == null) {
            return;
        }
        try (Stream<Path> paths = Files.walk(dir)) {
            paths.sorted(Comparator.reverseOrder()).forEach(path -> path.toFile().delete());
        } catch (IOException ignored) {
            // Best effort: a leftover temp dir must not turn a good render into an error.
        }
    }
}
