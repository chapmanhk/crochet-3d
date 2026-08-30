# Phase 4 — 3D preview at scale
# Performance and realism for larger patterns.

Feature: Scale preview
  As a crocheter designing larger pieces
  I want smooth 3D preview at scale
  So that I can work with big patterns without sluggish orbit controls

  Background:
    Given I am using the crochet pattern designer

  @e2e
  Scenario: Large pattern renders without blocking the toolbar
    When I choose "Templates"
    And I choose the "Large swatch" template
    Then the "Save pattern" control should be enabled
    And the stitch count should be at least 100

  @e2e
  Scenario: Attachment target is announced in the info panel
    Given I have a foundation chain of 6
    When I choose "New Row"
    Then the info panel should describe the next attachment target
    And the attachment target description should include "attaches to stitch"

  @engine
  Scenario: Instanced row rendering batches stitches by prototype
    Given a working row with 10 single crochet stitches
    When the row segment is built for instanced rendering
    Then stitch prototypes should be reused across instances

  @engine
  Scenario: Merged segment geometry reduces mesh count
    Given a foundation chain of 6
    When the foundation segment is built with merged geometry
    Then the segment should use merged rendering mode
    And multiple strand geometries should be merged for drawing
