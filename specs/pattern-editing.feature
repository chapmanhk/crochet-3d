@e2e
Feature: Pattern editing
  As a crocheter
  I want to undo and redo stitch placements
  So that I can recover from mistakes

  Background:
    Given I am using the crochet pattern designer

  Scenario: Undo removes the last placed single crochet
    Given I have a foundation chain of 3
    And I am on row 1 with 2 single crochet stitches placed
    When I choose "Undo"
    Then the stitch count should decrease by 1
    And the row progress should be "1/3"

  Scenario: Redo restores an undone placement
    Given I have a foundation chain of 3
    And I am on row 1 with 2 single crochet stitches placed
    When I choose "Undo"
    And I choose "Redo"
    Then the stitch count should be 5

  Scenario: Undo is disabled with nothing to undo
    Given I have no pattern
    Then the "Undo" control should be disabled

  Scenario: Reset clears undo and redo history
    Given I have a foundation chain of 3
    And I am on row 1 with 1 single crochet stitch placed
    When I choose "Undo"
    And I choose "Reset" and confirm
    Then the "Undo" control should be disabled

  @engine
  Scenario: Undo after startNewRow reverts row increment
    Given row 1 is complete on a foundation chain of 3
    And I have started row 2 with no stitches
    When I undo the last action
    Then the current row should be 1
