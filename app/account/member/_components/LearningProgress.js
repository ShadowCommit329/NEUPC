/**
 * @file Learning progress tracker — dashboard widget showing the
 *   member’s roadmap and bootcamps completion percentages.
 * @module MemberLearningProgress
 */

'use client';

const progressColors = {
  blue: 'bg-blue-500',
  green: 'bg-green-500',
  purple: 'bg-purple-500',
};

const progressTextColors = {
  blue: 'text-blue-400',
  green: 'text-green-400',
  purple: 'text-purple-400',
};

export default function LearningProgress({ roadmaps }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/5 p-4 backdrop-blur-xl sm:p-6">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-white">🗺 Learning Progress</h2>
          <p className="text-sm text-gray-400">Track your roadmap completion</p>
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {roadmaps.map((roadmap, idx) => (
          <div
            key={idx}
            className="rounded-lg border border-white/10 bg-white/5 p-4 transition-all duration-200 hover:border-white/20 hover:bg-white/10"
          >
            <div className="mb-3 flex items-center justify-between">
              <h3 className="font-semibold text-white">{roadmap.name}</h3>
              <span
                className={`text-sm font-bold ${progressTextColors[roadmap.color]}`}
              >
                {roadmap.progress}%
              </span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-white/10">
              <div
                className={`h-full rounded-full ${progressColors[roadmap.color]} transition-all duration-500`}
                style={{ width: `${roadmap.progress}%` }}
              />
            </div>
            <p className="mt-2 text-xs text-gray-400">
              {roadmap.progress >= 80
                ? 'Almost there!'
                : roadmap.progress >= 50
                  ? 'Great progress!'
                  : 'Keep going!'}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
