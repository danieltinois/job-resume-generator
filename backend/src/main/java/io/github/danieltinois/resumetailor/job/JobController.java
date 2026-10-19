package io.github.danieltinois.resumetailor.job;

import java.util.List;
import java.util.UUID;

import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;

import io.github.danieltinois.resumetailor.common.CurrentUser;
import io.github.danieltinois.resumetailor.common.NotFoundException;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

@Tag(name = "Jobs", description = "Pasted job descriptions and how the profile matches them")
@RestController
@RequestMapping("/api/jobs")
public class JobController {

    public record CreateRequest(@NotBlank @Size(max = 50_000) String description) {
    }

    private final JobRepository jobs;
    private final JobParser parser;
    private final CurrentUser currentUser;

    public JobController(JobRepository jobs, JobParser parser, CurrentUser currentUser) {
        this.jobs = jobs;
        this.parser = parser;
        this.currentUser = currentUser;
    }

    @Operation(summary = "Save a pasted job description")
    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public StoredJob create(@Valid @RequestBody CreateRequest request, Authentication authentication) {
        UUID userId = currentUser.require(authentication).id();
        return jobs.create(userId, parser.parse(request.description()), request.description());
    }

    @Operation(summary = "List jobs, newest first")
    @GetMapping
    public List<StoredJob.Summary> list(Authentication authentication) {
        return jobs.list(currentUser.require(authentication).id()).stream().map(StoredJob::summary).toList();
    }

    @Operation(summary = "One job with its description")
    @GetMapping("/{id}")
    public StoredJob get(@PathVariable UUID id, Authentication authentication) {
        return jobs.find(currentUser.require(authentication).id(), id).orElseThrow(NotFoundException::new);
    }

    @Operation(summary = "Delete a job and its resumes")
    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable UUID id, Authentication authentication) {
        if (!jobs.delete(currentUser.require(authentication).id(), id)) {
            throw new NotFoundException();
        }
    }
}
