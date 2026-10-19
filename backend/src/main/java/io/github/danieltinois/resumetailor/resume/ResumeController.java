package io.github.danieltinois.resumetailor.resume;

import java.util.List;
import java.util.Locale;
import java.util.UUID;

import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

import io.github.danieltinois.resumetailor.common.CurrentUser;
import io.github.danieltinois.resumetailor.common.Language;
import io.github.danieltinois.resumetailor.common.NotFoundException;
import io.github.danieltinois.resumetailor.job.JobRepository;
import io.github.danieltinois.resumetailor.profile.Profile;
import io.github.danieltinois.resumetailor.profile.ProfileRepository;
import io.github.danieltinois.resumetailor.profile.StoredProfile;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;

@RestController
@RequestMapping("/api/resumes")
public class ResumeController {

    public record ResumeRequest(@NotNull UUID jobId, @NotNull Language language, @NotNull Selection selection) {
    }

    public record Created(UUID id, List<String> warnings) {
    }

    private final ResumeRepository resumes;
    private final JobRepository jobs;
    private final ProfileRepository profiles;
    private final ResumeAssembler assembler;
    private final TypstRenderer renderer;
    private final CurrentUser currentUser;

    public ResumeController(ResumeRepository resumes, JobRepository jobs, ProfileRepository profiles,
            ResumeAssembler assembler, TypstRenderer renderer, CurrentUser currentUser) {
        this.resumes = resumes;
        this.jobs = jobs;
        this.profiles = profiles;
        this.assembler = assembler;
        this.renderer = renderer;
        this.currentUser = currentUser;
    }

    /** Renders without saving: the review screen calls this on every change. */
    @PostMapping(value = "/preview", produces = MediaType.APPLICATION_PDF_VALUE)
    public byte[] preview(@Valid @RequestBody ResumeRequest request, Authentication authentication) {
        return renderer.render(assemble(currentUser.require(authentication).id(), request).document());
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public Created save(@Valid @RequestBody ResumeRequest request, Authentication authentication) {
        UUID userId = currentUser.require(authentication).id();
        AssembledResume resume = assemble(userId, request);
        UUID id = resumes.create(userId, request.jobId(), request.language(), request.selection(), resume.document());
        return new Created(id, resume.warnings());
    }

    @GetMapping
    public List<ResumeRepository.Summary> list(@RequestParam(required = false) UUID jobId,
            Authentication authentication) {
        return resumes.list(currentUser.require(authentication).id(), jobId);
    }

    /** Renders the frozen snapshot, so the PDF matches what was saved even after profile edits. */
    @GetMapping("/{id}/pdf")
    public ResponseEntity<byte[]> pdf(@PathVariable UUID id, Authentication authentication) {
        ResumeRepository.Saved saved = resumes.find(currentUser.require(authentication).id(), id)
                .orElseThrow(NotFoundException::new);
        String file = "resume-" + saved.summary().language().name().toLowerCase(Locale.ROOT) + ".pdf";
        return ResponseEntity.ok()
                .contentType(MediaType.APPLICATION_PDF)
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + file + "\"")
                .body(renderer.render(saved.snapshot()));
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable UUID id, Authentication authentication) {
        if (!resumes.delete(currentUser.require(authentication).id(), id)) {
            throw new NotFoundException();
        }
    }

    private AssembledResume assemble(UUID userId, ResumeRequest request) {
        jobs.find(userId, request.jobId()).orElseThrow(NotFoundException::new);
        Profile profile = profiles.find(userId).map(StoredProfile::data)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNPROCESSABLE_CONTENT,
                        "Create your profile before generating a resume"));
        return assembler.assemble(profile, request.selection(), request.language());
    }
}
