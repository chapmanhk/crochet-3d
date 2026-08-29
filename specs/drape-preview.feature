# Drape preview — yarn constraint simulation (scene layer)
# Physics stays in src/scene/preview/; engine placement rules unchanged.

Feature: Drape preview yarn constraints
  As a crocheter previewing how fabric might hang
  I want stitches connected by yarn-like springs
  So that drape preview feels closer to real crochet fabric than loose balls

  Background:
    Given I am using the crochet pattern designer

  @engine
  Scenario: Drape graph connects stitches to parent loop anchors
    Given a foundation chain of 4
    And a working row with 4 single crochet stitches
    When the drape graph is built
    Then each working stitch should have a loop spring to its parent anchor

  @engine
  Scenario: Drape graph connects same-row neighbors with post springs
    Given a foundation chain of 4
    And a working row with 4 single crochet stitches
    When the drape graph is built
    Then adjacent stitches in the row should be linked by post springs

  @engine
  Scenario: Drape graph caps simulation size for very large patterns
    Given a pattern with more than 200 working stitches
    When the drape graph is built
    Then the simulation node count should be at most 200

  @e2e
  Scenario: Drape preview with yarn constraints remains toggleable
    Given I have a foundation chain of 6
    When I choose "New Row"
    And I enable drape preview
    Then the drape preview toggle should show "Drape preview on"
    When I disable drape preview
    Then the drape preview toggle should show "Drape preview off"
