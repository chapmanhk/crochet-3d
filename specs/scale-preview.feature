# Phase 4 — 3D preview at scale
# Performance and realism for larger patterns.

Feature: Scale preview and drape
  As a crocheter designing larger pieces
  I want smooth 3D preview and optional drape feedback
  So that I can work with big patterns without sluggish orbit controls

  Background:
    Given I am using the crochet pattern designer

  @e2e
  Scenario: Large pattern renders without blocking the toolbar
    Given I load the "large swatch" template
    When the 3D canvas finishes loading
    Then the toolbar should remain interactive
    And the pattern should show at least 100 stitches

  @e2e
  Scenario: Drape preview can be toggled on and off
    Given I have a pattern with at least one working row
    When I enable drape preview
    Then drape preview should be active
    When I disable drape preview
    Then drape preview should be inactive

  @e2e
  Scenario: Attachment target is announced in the info panel
    Given I have a foundation chain of 6
    And I have started row 1
    When the attachment point is visible
    Then the info panel should describe the next attachment target

  @engine
  Scenario: Instanced row rendering batches stitches by prototype
    Given a working row with 20 single crochet stitches
    When the row segment is built for instanced rendering
    Then stitch prototypes should be reused across instances

  @engine
  Scenario: Merged segment geometry reduces mesh count
    Given a foundation chain segment with multiple chain loops
    When the segment is built with merged geometry
    Then the segment should use at most two yarn meshes
