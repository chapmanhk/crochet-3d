@e2e
Feature: Stitch types
  As a crocheter
  I want to work half double crochet and double crochet stitches
  So that my patterns can use common stitch heights

  Background:
    Given I am using the crochet pattern designer
    And I have a foundation chain of 3
    And I am on row 1

  Scenario: Place half double crochet stitches
    Given the selected stitch type is "HDC"
    When I choose "Add stitch"
    Then the stitch count should be 4
    And the instructions should include "hdc"

  Scenario: Place double crochet stitches
    Given the selected stitch type is "DC"
    When I choose "Add stitch"
    Then the stitch count should be 4
    And the instructions should include "dc"

  @engine
  Scenario: Half double crochet attaches like single crochet
    Given I am on row 1
    When I add a half double crochet stitch
    Then it should attach to the first foundation stitch

  @engine
  Scenario: Increase places two stitches in one parent slot
    Given I am on row 1
    When I add an increase
    Then the row should have 2 stitches
    And both stitches should attach to the same parent stitch

  @engine
  Scenario: Decrease uses two parent stitches
    Given I am on row 1 with 2 single crochet stitches placed
    When I add a decrease
    Then the row should have 3 stitches
    And the decrease should attach to two parent stitches
