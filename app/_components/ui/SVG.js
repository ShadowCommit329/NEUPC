/**
 * @file S V G
 * @module SVG
 */

function SVG() {
  return (
    <svg
      className="h-auto w-full max-w-xs drop-shadow-2xl sm:max-w-sm md:max-w-lg"
      viewBox="0 0 600 650"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Problem Statement Card */}
      <rect
        x="40"
        y="30"
        width="250"
        height="160"
        rx="10"
        fill="#1E293B"
        stroke="#3B82F6"
        strokeWidth="2"
      />
      <rect x="40" y="30" width="250" height="35" rx="10" fill="#334155" />
      <text x="55" y="52" fill="#60A5FA" fontSize="14" fontWeight="bold">
        Problem: Two Sum
      </text>
      <circle cx="270" cy="47" r="5" fill="#10B981" />
      <text x="210" y="52" fill="#10B981" fontSize="11">
        Easy
      </text>

      {/* Problem Description */}
      <text x="55" y="85" fill="#CBD5E1" fontSize="10" fontFamily="monospace">
        Given array nums and
      </text>
      <text x="55" y="100" fill="#CBD5E1" fontSize="10" fontFamily="monospace">
        target, return indices
      </text>
      <text x="55" y="115" fill="#CBD5E1" fontSize="10" fontFamily="monospace">
        that sum to target.
      </text>

      {/* Sample Input/Output */}
      <text x="55" y="135" fill="#F59E0B" fontSize="9" fontWeight="bold">
        Input:
      </text>
      <text x="95" y="135" fill="#94A3B8" fontSize="9" fontFamily="monospace">
        [2,7,11,15], 9
      </text>
      <text x="55" y="150" fill="#10B981" fontSize="9" fontWeight="bold">
        Output:
      </text>
      <text x="100" y="150" fill="#94A3B8" fontSize="9" fontFamily="monospace">
        [0, 1]
      </text>
      <text x="55" y="170" fill="#8B5CF6" fontSize="10" fontWeight="bold">
        Time: O(n)
      </text>
      <text x="140" y="170" fill="#EC4899" fontSize="10" fontWeight="bold">
        Space: O(n)
      </text>

      {/* Contest Timer */}
      <rect
        x="310"
        y="30"
        width="260"
        height="50"
        rx="8"
        fill="#0F172A"
        stroke="#F59E0B"
        strokeWidth="2"
      />
      <text x="330" y="52" fill="#F59E0B" fontSize="12" fontWeight="bold">
        Contest Time:
      </text>
      <text
        x="445"
        y="52"
        fill="#FBBF24"
        fontSize="20"
        fontWeight="bold"
        fontFamily="monospace"
      >
        2:45:30
      </text>
      <circle cx="320" cy="67" r="3" fill="#10B981">
        <animate
          attributeName="opacity"
          values="1;0.3;1"
          dur="1s"
          repeatCount="indefinite"
        />
      </circle>
      <text x="330" y="70" fill="#94A3B8" fontSize="9">
        Problems Solved: 3/5
      </text>

      {/* Code Editor */}
      <rect x="310" y="90" width="260" height="280" rx="10" fill="#1E1E1E" />
      <rect x="310" y="90" width="260" height="30" rx="10" fill="#2D2D30" />

      {/* Editor Header */}
      <circle cx="325" cy="105" r="5" fill="#FF5F56" />
      <circle cx="340" cy="105" r="5" fill="#FFBD2E" />
      <circle cx="355" cy="105" r="5" fill="#27C93F" />
      <text x="370" y="110" fill="#FFFFFF" fontSize="10" fontFamily="monospace">
        solution.cpp
      </text>

      {/* Line numbers */}
      <text x="320" y="140" fill="#6B7280" fontSize="9" fontFamily="monospace">
        1
      </text>
      <text x="320" y="155" fill="#6B7280" fontSize="9" fontFamily="monospace">
        2
      </text>
      <text x="320" y="170" fill="#6B7280" fontSize="9" fontFamily="monospace">
        3
      </text>
      <text x="320" y="185" fill="#6B7280" fontSize="9" fontFamily="monospace">
        4
      </text>
      <text x="320" y="200" fill="#6B7280" fontSize="9" fontFamily="monospace">
        5
      </text>
      <text x="320" y="215" fill="#6B7280" fontSize="9" fontFamily="monospace">
        6
      </text>
      <text x="320" y="230" fill="#6B7280" fontSize="9" fontFamily="monospace">
        7
      </text>
      <text x="320" y="245" fill="#6B7280" fontSize="9" fontFamily="monospace">
        8
      </text>
      <text x="320" y="260" fill="#6B7280" fontSize="9" fontFamily="monospace">
        9
      </text>

      {/* Code with syntax highlighting */}
      <text x="340" y="140" fill="#4EC9B0" fontSize="9" fontFamily="monospace">
        vector
      </text>
      <text x="375" y="140" fill="#DCDCAA" fontSize="9" fontFamily="monospace">
        {'<int>'}
      </text>
      <text x="415" y="140" fill="#DCDCAA" fontSize="9" fontFamily="monospace">
        twoSum
      </text>
      <text x="455" y="140" fill="#D4D4D4" fontSize="9" fontFamily="monospace">
        () {'{'}
      </text>

      <text x="345" y="155" fill="#4EC9B0" fontSize="9" fontFamily="monospace">
        unordered_map
      </text>
      <text x="430" y="155" fill="#9CDCFE" fontSize="9" fontFamily="monospace">
        mp;
      </text>

      <text x="345" y="170" fill="#C586C0" fontSize="9" fontFamily="monospace">
        for
      </text>
      <text x="365" y="170" fill="#D4D4D4" fontSize="9" fontFamily="monospace">
        (
      </text>
      <text x="370" y="170" fill="#569CD6" fontSize="9" fontFamily="monospace">
        int
      </text>
      <text x="390" y="170" fill="#9CDCFE" fontSize="9" fontFamily="monospace">
        i=
      </text>
      <text x="405" y="170" fill="#B5CEA8" fontSize="9" fontFamily="monospace">
        0
      </text>
      <text x="412" y="170" fill="#D4D4D4" fontSize="9" fontFamily="monospace">
        ; i
      </text>
      <text x="425" y="170" fill="#D4D4D4" fontSize="9" fontFamily="monospace">
        {'<n)'}
      </text>
      <text x="455" y="170" fill="#D4D4D4" fontSize="9" fontFamily="monospace">
        {'{'}
      </text>

      <text x="350" y="185" fill="#C586C0" fontSize="9" fontFamily="monospace">
        if
      </text>
      <text x="365" y="185" fill="#D4D4D4" fontSize="9" fontFamily="monospace">
        (mp.count(
      </text>
      <text x="425" y="185" fill="#9CDCFE" fontSize="9" fontFamily="monospace">
        tar-x
      </text>
      <text x="455" y="185" fill="#D4D4D4" fontSize="9" fontFamily="monospace">
        ))
      </text>

      <text x="355" y="200" fill="#C586C0" fontSize="9" fontFamily="monospace">
        return
      </text>
      <text x="395" y="200" fill="#D4D4D4" fontSize="9" fontFamily="monospace">
        {'{'}
      </text>
      <text x="402" y="200" fill="#9CDCFE" fontSize="9" fontFamily="monospace">
        i, mp[x]
      </text>
      <text x="455" y="200" fill="#D4D4D4" fontSize="9" fontFamily="monospace">
        {'};'}
      </text>

      <text x="350" y="215" fill="#9CDCFE" fontSize="9" fontFamily="monospace">
        mp
      </text>
      <text x="365" y="215" fill="#D4D4D4" fontSize="9" fontFamily="monospace">
        [nums[i]] = i;
      </text>

      <text x="345" y="230" fill="#D4D4D4" fontSize="9" fontFamily="monospace">
        {'}'}
      </text>
      <text x="340" y="245" fill="#C586C0" fontSize="9" fontFamily="monospace">
        return
      </text>
      <text x="380" y="245" fill="#D4D4D4" fontSize="9" fontFamily="monospace">
        {'{ };'}
      </text>
      <text x="340" y="260" fill="#D4D4D4" fontSize="9" fontFamily="monospace">
        {'}'}
      </text>

      {/* Test Results */}
      <rect x="310" y="280" width="260" height="90" fill="#0A0F1E" />
      <text x="320" y="295" fill="#10B981" fontSize="10" fontWeight="bold">
        ✓ Test Case 1: Passed
      </text>
      <text x="320" y="310" fill="#10B981" fontSize="10" fontWeight="bold">
        ✓ Test Case 2: Passed
      </text>
      <text x="320" y="325" fill="#10B981" fontSize="10" fontWeight="bold">
        ✓ Test Case 3: Passed
      </text>
      <text x="320" y="345" fill="#60A5FA" fontSize="9">
        Runtime: 8ms
      </text>
      <text x="420" y="345" fill="#8B5CF6" fontSize="9">
        Memory: 10.2MB
      </text>
      <text x="320" y="360" fill="#10B981" fontSize="11" fontWeight="bold">
        Accepted! 🎉
      </text>

      {/* Binary Tree Visualization */}
      <g opacity="0.9">
        <circle
          cx="165"
          cy="230"
          r="18"
          fill="#3B82F6"
          stroke="#60A5FA"
          strokeWidth="2"
        />
        <text x="158" y="237" fill="#FFF" fontSize="14" fontWeight="bold">
          8
        </text>

        <line
          x1="150"
          y1="245"
          x2="100"
          y2="280"
          stroke="#60A5FA"
          strokeWidth="2"
        />
        <line
          x1="180"
          y1="245"
          x2="230"
          y2="280"
          stroke="#60A5FA"
          strokeWidth="2"
        />

        <circle
          cx="100"
          cy="290"
          r="16"
          fill="#8B5CF6"
          stroke="#A78BFA"
          strokeWidth="2"
        />
        <text x="93" y="297" fill="#FFF" fontSize="13" fontWeight="bold">
          3
        </text>

        <circle
          cx="230"
          cy="290"
          r="16"
          fill="#8B5CF6"
          stroke="#A78BFA"
          strokeWidth="2"
        />
        <text x="221" y="297" fill="#FFF" fontSize="13" fontWeight="bold">
          10
        </text>

        <line
          x1="85"
          y1="305"
          x2="60"
          y2="335"
          stroke="#A78BFA"
          strokeWidth="2"
        />
        <line
          x1="115"
          y1="305"
          x2="140"
          y2="335"
          stroke="#A78BFA"
          strokeWidth="2"
        />

        <circle
          cx="60"
          cy="345"
          r="14"
          fill="#10B981"
          stroke="#34D399"
          strokeWidth="2"
        />
        <text x="54" y="351" fill="#FFF" fontSize="12" fontWeight="bold">
          1
        </text>

        <circle
          cx="140"
          cy="345"
          r="14"
          fill="#10B981"
          stroke="#34D399"
          strokeWidth="2"
        />
        <text x="134" y="351" fill="#FFF" fontSize="12" fontWeight="bold">
          6
        </text>

        <text x="80" y="380" fill="#60A5FA" fontSize="11" fontWeight="bold">
          Binary Tree
        </text>
      </g>

      {/* Graph Visualization */}
      <g opacity="0.8">
        <circle
          cx="80"
          cy="440"
          r="15"
          fill="#F59E0B"
          stroke="#FBBF24"
          strokeWidth="2"
        />
        <text x="74" y="446" fill="#000" fontSize="12" fontWeight="bold">
          A
        </text>

        <circle
          cx="150"
          cy="420"
          r="15"
          fill="#F59E0B"
          stroke="#FBBF24"
          strokeWidth="2"
        />
        <text x="144" y="426" fill="#000" fontSize="12" fontWeight="bold">
          B
        </text>

        <circle
          cx="120"
          cy="490"
          r="15"
          fill="#F59E0B"
          stroke="#FBBF24"
          strokeWidth="2"
        />
        <text x="114" y="496" fill="#000" fontSize="12" fontWeight="bold">
          C
        </text>

        <circle
          cx="200"
          cy="470"
          r="15"
          fill="#F59E0B"
          stroke="#FBBF24"
          strokeWidth="2"
        />
        <text x="194" y="476" fill="#000" fontSize="12" fontWeight="bold">
          D
        </text>

        <line
          x1="92"
          y1="446"
          x2="110"
          y2="485"
          stroke="#FBBF24"
          strokeWidth="2"
        />
        <line
          x1="93"
          y1="436"
          x2="137"
          y2="424"
          stroke="#FBBF24"
          strokeWidth="2"
        />
        <line
          x1="145"
          y1="433"
          x2="127"
          y2="478"
          stroke="#FBBF24"
          strokeWidth="2"
        />
        <line
          x1="135"
          y1="488"
          x2="185"
          y2="472"
          stroke="#FBBF24"
          strokeWidth="2"
        />
        <line
          x1="163"
          y1="428"
          x2="188"
          y2="462"
          stroke="#FBBF24"
          strokeWidth="2"
        />

        <text x="105" y="530" fill="#F59E0B" fontSize="11" fontWeight="bold">
          Graph DFS/BFS
        </text>
      </g>

      {/* Rankings/Leaderboard */}
      <rect
        x="310"
        y="390"
        width="260"
        height="135"
        rx="8"
        fill="#1E293B"
        stroke="#10B981"
        strokeWidth="2"
      />
      <text x="380" y="410" fill="#10B981" fontSize="13" fontWeight="bold">
        🏆 Leaderboard
      </text>

      <text x="325" y="435" fill="#FBBF24" fontSize="11" fontWeight="bold">
        🥇 1st
      </text>
      <text x="375" y="435" fill="#E2E8F0" fontSize="10">
        coder_master
      </text>
      <text x="500" y="435" fill="#10B981" fontSize="10">
        450 pts
      </text>

      <text x="325" y="455" fill="#D1D5DB" fontSize="11" fontWeight="bold">
        🥈 2nd
      </text>
      <text x="375" y="455" fill="#E2E8F0" fontSize="10">
        algo_ninja
      </text>
      <text x="500" y="455" fill="#10B981" fontSize="10">
        420 pts
      </text>

      <text x="325" y="475" fill="#CD7F32" fontSize="11" fontWeight="bold">
        🥉 3rd
      </text>
      <text x="375" y="475" fill="#E2E8F0" fontSize="10">
        cp_warrior
      </text>
      <text x="500" y="475" fill="#10B981" fontSize="10">
        380 pts
      </text>

      <rect
        x="325"
        y="485"
        width="230"
        height="25"
        rx="4"
        fill="#0F172A"
        stroke="#60A5FA"
        strokeWidth="1"
      />
      <text x="335" y="500" fill="#60A5FA" fontSize="10" fontWeight="bold">
        → You
      </text>
      <text x="375" y="500" fill="#E2E8F0" fontSize="10">
        code_enthusiast
      </text>
      <text x="510" y="500" fill="#10B981" fontSize="10">
        340 pts
      </text>

      {/* Platform Badges */}
      <g opacity="0.7">
        <circle cx="80" cy="580" r="22" fill="#1F8ACB">
          <animate
            attributeName="cy"
            values="580;575;580"
            dur="2s"
            repeatCount="indefinite"
          />
        </circle>
        <text x="67" y="588" fill="#FFF" fontSize="11" fontWeight="bold">
          CF
        </text>
      </g>

      <g opacity="0.7">
        <circle cx="160" cy="600" r="22" fill="#FFA116">
          <animate
            attributeName="cy"
            values="600;595;600"
            dur="2.3s"
            repeatCount="indefinite"
          />
        </circle>
        <text x="146" y="608" fill="#FFF" fontSize="11" fontWeight="bold">
          LC
        </text>
      </g>

      <g opacity="0.7">
        <circle cx="240" cy="590" r="22" fill="#2EBF91">
          <animate
            attributeName="cy"
            values="590;585;590"
            dur="2.5s"
            repeatCount="indefinite"
          />
        </circle>
        <text x="226" y="598" fill="#FFF" fontSize="11" fontWeight="bold">
          CC
        </text>
      </g>

      {/* Floating Complexity Notations */}
      <text
        x="15"
        y="100"
        fill="#10B981"
        fontSize="18"
        fontWeight="bold"
        opacity="0.4"
      >
        O(1)
      </text>
      <text
        x="25"
        y="320"
        fill="#60A5FA"
        fontSize="20"
        fontWeight="bold"
        opacity="0.4"
      >
        O(n)
      </text>
      <text
        x="245"
        y="540"
        fill="#8B5CF6"
        fontSize="16"
        fontWeight="bold"
        opacity="0.4"
      >
        O(log n)
      </text>
      <text
        x="555"
        y="250"
        fill="#F59E0B"
        fontSize="17"
        fontWeight="bold"
        opacity="0.4"
      >
        O(n²)
      </text>
    </svg>
  );
}

export default SVG;
